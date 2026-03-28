import { apiPost } from "./client";
import type { ApiResponse, TransactionType } from "../types";

export const createSpotTransaction = async (payload: {
  type: TransactionType;
  account_id: number;
  to_account_id?: number | null;
  amount: number;
  memo?: string;
  transaction_date: string;
}): Promise<ApiResponse<{ id: number }>> => {
  return apiPost<{ id: number }>("/spot/store.php", payload);
};

export const deleteSpotTransaction = async (id: number): Promise<ApiResponse<unknown>> => {
  return apiPost<unknown>("/spot/delete.php", { id });
};
