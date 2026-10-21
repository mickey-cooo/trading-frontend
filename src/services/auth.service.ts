import { apiClient } from "@/lib/axios/client";
import { clearTokens, getRefreshToken, setTokens } from "@/lib/auth/session";
import type { AuthTokens } from "@/types/trading";

export async function login(email: string, password: string) {
  const { data } = await apiClient.post<AuthTokens>("/auth/login", { email, password });
  setTokens(data);
}

export async function register(email: string, password: string, confirmPassword: string) {
  await apiClient.post("/auth/register", { email, password, confirmPassword });
}

export async function logout() {
  const refreshToken = getRefreshToken();
  try {
    if (refreshToken) await apiClient.post("/auth/logout", { refreshToken });
  } finally {
    clearTokens();
  }
}
