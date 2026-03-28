import { apiGet, apiPost } from "./client";
import type { ApiResponse } from "../types";

export type PaydayStatus = {
  cycle_id: number;
  cycle_date: string;
  salary: number;
  salary_account_id: number | null;
  salary_account_name: string | null;
  salary_received: boolean;
  transfer_done: boolean;
  paid_count: number;
  total_count: number;
};

export const fetchPaydayStatus = async (): Promise<PaydayStatus | null> => {
  const res = await apiGet<PaydayStatus>("/monthly/payday-status.php");
  return res.success ? res.data : null;
};

export const executeSalary = async (payload: {
  monthly_cycle_id: number;
  amount: number;
  received_at: string;
}): Promise<ApiResponse<unknown>> => {
  return apiPost<unknown>("/salary/execute.php", payload);
};
