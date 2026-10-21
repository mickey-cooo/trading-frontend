import axios, { type AxiosError } from "axios";
import { expireSession, recheckSession } from "@/lib/auth/session";

// Same-origin BFF (src/app/api/bff): it adds the Bearer token from an HttpOnly cookie and renews it when it lapses.
export const apiClient = axios.create({
  baseURL: "/api/bff",
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // the BFF could not renew the login and has already cleared the cookies
    if (error.response?.headers["x-session-expired"]) expireSession();
    else if (error.response?.status === 401) recheckSession();
    return Promise.reject(error);
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
