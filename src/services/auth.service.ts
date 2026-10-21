import { apiClient } from "@/lib/axios/client";
import { sessionChanged } from "@/lib/auth/session";

export async function login(email: string, password: string) {
  await apiClient.post("/auth/login", { email, password });
  sessionChanged();
}

export async function register(email: string, password: string, confirmPassword: string) {
  await apiClient.post("/auth/register", { email, password, confirmPassword });
}

export async function logout() {
  try {
    await apiClient.post("/auth/logout");
  } finally {
    sessionChanged();
  }
}
