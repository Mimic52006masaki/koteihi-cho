import { apiGet, apiPost } from "./client";
import type { ApiResponse, MonthlyCostItem, SpotTransaction } from "../types";

export type CurrentMonthlyData = {
  cycle_id: number;
  cycle_date: string;
  status: "open" | "closed";
  items: MonthlyCostItem[];
  spots: SpotTransaction[];
};

export type MonthSummary = {
  id: number;
  cycle_date: string;
  total_planned: number;
  total_actual: number;
};

export type MonthlyHistoryDetail = {
  cycle: { id: number; cycle_date: string };
  items: {
    id: number;
    name: string;
    amount: number;
    actual_amount: number | null;
  }[];
};

export const fetchCurrentMonthly = async (): Promise<CurrentMonthlyData | null> => {
  const res = await apiGet<CurrentMonthlyData>("/monthly/current.php");
  return res.success ? res.data : null;
};

export const fetchMonthlyHistory = async (): Promise<MonthSummary[]> => {
  const res = await apiGet<MonthSummary[]>("/monthly/history.php");
  return res.data;
};

export const fetchHistoryDetail = async (id: string): Promise<MonthlyHistoryDetail> => {
  const res = await apiGet<MonthlyHistoryDetail>(`/monthly/history-detail.php?id=${id}`);
  return res.data;
};

export const generateMonthly = async (cycle_date: string): Promise<ApiResponse<unknown>> => {
  return apiPost<unknown>("/monthly/generate.php", { cycle_date });
};

export const closeMonthly = async (close_date: string): Promise<ApiResponse<unknown>> => {
  return apiPost<unknown>("/monthly/close.php", { close_date });
};

export const payFixedCost = async (payload: {
  monthly_fixed_cost_id: number;
  account_id: number;
  amount: number;
  paid_date: string;
}): Promise<ApiResponse<unknown>> => {
  return apiPost<unknown>("/monthly/pay.php", payload);
};

export const unpayFixedCost = async (monthly_fixed_cost_id: number): Promise<ApiResponse<unknown>> => {
  return apiPost<unknown>("/monthly/unpay.php", { monthly_fixed_cost_id });
};

export const deleteMonthly = async (id: number): Promise<void> => {
  const res = await apiPost<unknown>("/monthly/delete.php", { id });
  if (!res.success) throw new Error(res.error ?? "削除に失敗しました");
};
