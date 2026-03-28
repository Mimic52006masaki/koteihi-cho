import { apiGet, apiPost } from "./client";
import type { ApiResponse, FixedCost } from "../types";

export const fetchFixedCosts = async (): Promise<FixedCost[]> => {
  const res = await apiGet<FixedCost[]>("/fixed-costs/index.php");
  return res.data.map((c: FixedCost) => ({
    ...c,
    default_amount: Number(c.default_amount),
    is_active: Boolean(c.is_active),
  }));
};

export const createFixedCost = async (payload: {
  name: string;
  default_amount: number;
}): Promise<ApiResponse<unknown>> => {
  return apiPost<unknown>("/fixed-costs/store.php", payload);
};

export const updateFixedCost = async (payload: {
  id: number;
  name: string;
  default_amount: number;
}): Promise<ApiResponse<unknown>> => {
  return apiPost<unknown>("/fixed-costs/update.php", payload);
};

export const toggleFixedCost = async (id: number): Promise<ApiResponse<unknown>> => {
  return apiPost<unknown>("/fixed-costs/toggle.php", { id });
};
