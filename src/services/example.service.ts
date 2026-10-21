import { isAxiosError } from "axios";
import { apiClient } from "@/lib/axios/client";
import type { ExampleItem } from "@/types/example.type";

function normalizeError(error: unknown) {
  if (isAxiosError(error)) {
    return error.response?.data ?? error.message;
  }
  return error;
}

export async function getExampleItems(): Promise<ExampleItem[]> {
  try {
    const { data } = await apiClient.get<ExampleItem[]>("/example");
    return data;
  } catch (error) {
    throw normalizeError(error);
  }
}

export async function getExampleItem(id: string): Promise<ExampleItem> {
  try {
    const { data } = await apiClient.get<ExampleItem>(`/example/${id}`);
    return data;
  } catch (error) {
    throw normalizeError(error);
  }
}
