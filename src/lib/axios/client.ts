import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "@/lib/config";
import {
  expireSession,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "@/lib/auth/session";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

type Retriable = InternalAxiosRequestConfig & { _retry?: boolean };
type Waiter = { resolve: () => void; reject: (e: unknown) => void };

let isRefreshing = false;
let waiters: Waiter[] = [];

apiClient.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? getAccessToken() : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as Retriable | undefined;
    const isAuthCall = original?.url?.startsWith("/auth/");

    if (
      !original ||
      error.response?.status !== 401 ||
      original._retry ||
      isAuthCall ||
      !getRefreshToken()
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // a queued request that 401s again after the refresh must fail, not start another refresh
      original._retry = true;
      return new Promise((resolve, reject) => {
        waiters.push({ resolve: () => resolve(apiClient(original)), reject });
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      // the backend rotates refresh tokens: reusing the old one revokes the whole login
      // one refresh at a time across tabs: a second tab sending the already-rotated token
      // would make the backend revoke the whole login. It re-reads the token inside the lock.
      const refresh = async () => {
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken: getRefreshToken(),
        });
        setTokens(data);
      };
      if (navigator.locks) await navigator.locks.request("apextrade-refresh", refresh);
      else await refresh();
      waiters.forEach((w) => w.resolve());
      return apiClient(original);
    } catch (refreshError) {
      // only a rejected token ends the session; a network blip or 5xx keeps it
      const status = axios.isAxiosError(refreshError) ? refreshError.response?.status : undefined;
      if (status === 400 || status === 401) expireSession();
      waiters.forEach((w) => w.reject(refreshError));
      return Promise.reject(refreshError);
    } finally {
      waiters = [];
      isRefreshing = false;
    }
  },
);

// ProblemDetail ({detail, errors}) from the backend, else the plain message
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as
      | { detail?: string; errors?: Record<string, string> }
      | undefined;
    const first = body?.errors && Object.values(body.errors)[0];
    if (error.response?.status === 0 || error.code === "ERR_NETWORK") {
      return "Cannot reach the trading API. Is the backend running?";
    }
    return first ?? body?.detail ?? error.message;
  }
  return error instanceof Error ? error.message : "Something went wrong";
}
