import { apiGet, apiPost } from "./client";
import type { ApiResponse } from "../types";

export type MonthlyCostItem = {
  id: number;
  name: string;
  amount: number;
  paid_amount: number | null;
  paid_date: string | null;
  account_name: string | null;
  account_id: number | null;
};

export type CurrentMonthlyData = {
  cycle_id: number;
  cycle_date: string;
  status: "open" | "closed";
  salary: number;
  salary_account_id: number | null;
  salary_account_name: string | null;
  salary_received: boolean;
  items: MonthlyCostItem[];
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

export const generateMonthly = async (): Promise<ApiResponse<unknown>> => {
  return apiPost<unknown>("/monthly/generate.php");
};

export const closeMonthly = async (): Promise<ApiResponse<unknown>> => {
  return apiPost<unknown>("/monthly/close.php");
};

export const updateCycle = async (payload: {
  cycle_id: number;
  salary: number;
  salary_account_id: number | null;
}): Promise<ApiResponse<unknown>> => {
  return apiPost<unknown>("/monthly/update-cycle.php", payload);
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
