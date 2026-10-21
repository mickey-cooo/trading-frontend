import { apiClient } from "@/lib/axios/client";
import type {
  Order,
  OrderStatus,
  Page,
  SubmitOrderRequest,
  Trade,
} from "@/types/trading";

// Reuse the same key to retry a request whose answer was lost: the backend replays it.
export async function submitOrder(request: SubmitOrderRequest, idempotencyKey: string) {
  const { data } = await apiClient.post<Order>("/orders", request, {
    headers: { "Idempotency-Key": idempotencyKey },
  });
  return data;
}

export async function getOrders(status?: OrderStatus, page = 0, size = 20) {
  const { data } = await apiClient.get<Page<Order>>("/orders", {
    params: { status, page, size },
  });
  return data;
}

export async function getOrder(id: string) {
  const { data } = await apiClient.get<Order>(`/orders/${id}`);
  return data;
}

export async function cancelOrder(id: string) {
  const { data } = await apiClient.post<Order>(`/orders/${id}/cancel`);
  return data;
}

export async function getTrades(page = 0, size = 20) {
  const { data } = await apiClient.get<Page<Trade>>("/trades", { params: { page, size } });
  return data;
}
