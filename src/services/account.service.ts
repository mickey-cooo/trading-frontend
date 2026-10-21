import { apiClient } from "@/lib/axios/client";
import type { Balance, LedgerEntry, Page, Portfolio } from "@/types/trading";

export async function getPortfolio() {
  const { data } = await apiClient.get<Portfolio>("/portfolio");
  return data;
}

export async function getBalances() {
  const { data } = await apiClient.get<Balance[]>("/accounts/me/balances");
  return data;
}

export async function getLedger(page = 0, size = 20) {
  const { data } = await apiClient.get<Page<LedgerEntry>>("/accounts/me/ledger", {
    params: { page, size },
  });
  return data;
}
