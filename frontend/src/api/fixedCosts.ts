import { apiGet, apiPost } from "./client";
import type { ApiResponse, FixedCost, TransactionType } from "../types";

export const fetchFixedCosts = async (): Promise<FixedCost[]> => {
  const res = await apiGet<FixedCost[]>("/fixed-costs/index.php");
  return res.data.map((c: FixedCost) => ({
    ...c,
    default_amount: Number(c.default_amount),
    is_active: Boolean(c.is_active),
    type: c.type ?? "payment",
    to_account_id: c.to_account_id ?? null,
  }));
};

export const createFixedCost = async (payload: {
  name: string;
  type: TransactionType;
  default_amount: number;
  default_account_id?: number | null;
  to_account_id?: number | null;
}): Promise<ApiResponse<unknown>> => {
  return apiPost<unknown>("/fixed-costs/store.php", payload);
};

export const updateFixedCost = async (payload: {
  id: number;
  name: string;
  type: TransactionType;
  default_amount: number;
  default_account_id?: number | null;
  to_account_id?: number | null;
}): Promise<ApiResponse<unknown>> => {
  return apiPost<unknown>("/fixed-costs/update.php", payload);
};

export const toggleFixedCost = async (id: number): Promise<ApiResponse<unknown>> => {
  return apiPost<unknown>("/fixed-costs/toggle.php", { id });
};

export const deleteFixedCost = async (id: number): Promise<void> => {
  const res = await apiPost<unknown>("/fixed-costs/delete.php", { id });
  if (!res.success) throw new Error(res.error ?? "削除に失敗しました");
};
