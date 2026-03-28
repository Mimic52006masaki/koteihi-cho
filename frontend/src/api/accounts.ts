import { apiGet, apiPost } from "./client";
import type { Account, ApiResponse } from "../types";

export const fetchAccounts = async (): Promise<Account[]> => {
  const res = await apiGet<Account[]>("/accounts/index.php");
  return res.data;
};

export const createAccount = async (payload: Omit<Account, "id">): Promise<ApiResponse<unknown>> => {
  return apiPost<unknown>("/accounts/create.php", payload);
};

export const updateAccount = async (payload: Account): Promise<ApiResponse<unknown>> => {
  return apiPost<unknown>("/accounts/update.php", payload);
};

export const deleteAccount = async (id: number): Promise<ApiResponse<unknown>> => {
  return apiPost<unknown>("/accounts/delete.php", { id });
};

export type AccountHistoryResponse = {
  account: { id: number; name: string; balance: number };
  histories: {
    id: number;
    change_amount: number;
    balance_after: number;
    type: "payment" | "transfer" | "salary";
    reason: string | null;
    created_at: string;
  }[];
};

export const fetchAccountHistory = async (id: number): Promise<AccountHistoryResponse> => {
  const res = await apiGet<AccountHistoryResponse>(`/accounts/history.php?id=${id}`);
  return res.data;
};
