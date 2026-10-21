import { apiClient } from "@/lib/axios/client";
import type { Market, Quote, UserProfile } from "@/types/trading";

// the backend only accepts ACTIVE and SUSPENDED here
export type AdminStatus = "ACTIVE" | "SUSPENDED";

export async function publishQuote(pair: string, price: string) {
  const { data } = await apiClient.post<Quote>(`/admin/markets/${encodeURIComponent(pair)}/quotes`, { price });
  return data;
}

export async function changeMarketStatus(pair: string, status: AdminStatus) {
  const { data } = await apiClient.patch<Market>(`/admin/markets/${encodeURIComponent(pair)}/status`, { status });
  return data;
}

export async function changeUserStatus(id: string, status: AdminStatus) {
  const { data } = await apiClient.patch<UserProfile>(`/admin/users/${id}/status`, { status });
  return data;
}
