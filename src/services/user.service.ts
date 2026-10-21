import { apiClient } from "@/lib/axios/client";
import type { ProfileInput, UserProfile } from "@/types/trading";

export async function getMe() {
  const { data } = await apiClient.get<UserProfile>("/users/me");
  return data;
}

export async function createProfile(input: ProfileInput) {
  const { data } = await apiClient.post<UserProfile>("/users/me/profile", input);
  return data;
}

export async function updateMe(input: Partial<ProfileInput>) {
  const { data } = await apiClient.patch<UserProfile>("/users/me", input);
  return data;
}

// admin only
export async function getUser(id: string) {
  const { data } = await apiClient.get<UserProfile>(`/users/${id}`);
  return data;
}

// admin only; the backend accepts 1-100 ids
export async function getUsers(ids: string[]) {
  const { data } = await apiClient.get<UserProfile[]>("/users", { params: { ids: ids.join(",") } });
  return data;
}
