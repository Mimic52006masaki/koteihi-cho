import { apiGet, apiPost } from "./client";
import type { ApiResponse } from "../types";

export type TransferItem = {
  account_id: number;
  account_name: string;
  amount: number;
  current_balance: number;
};

export type TransferPlanData = {
  items: TransferItem[];
  total_transfer: number;
  salary_account_id: number | null;
  salary_account_name: string | null;
  salary_balance: number;
  balance_after_transfer: number;
  salary_received: boolean;
};

export type TransferActual = {
  id: number;
  from_account_id: number;
  to_account_id: number;
  amount: number;
  transferred_at: string;
};

export const fetchTransferPlan = async (): Promise<TransferPlanData> => {
  const res = await apiGet<TransferPlanData>("/transfer/calculate.php");
  return res.data;
};

export const fetchTransferActuals = async (): Promise<TransferActual[]> => {
  const res = await apiGet<TransferActual[]>("/transfer/actual.php");
  return res.success ? res.data : [];
};

export const fetchTransferHistory = async (): Promise<unknown> => {
  const res = await apiGet<unknown>("/transfer/history.php");
  return res.data;
};

export const executeTransfer = async (): Promise<ApiResponse<{ total_transfer: number }>> => {
  return apiPost<{ total_transfer: number }>("/transfer/execute.php");
};
