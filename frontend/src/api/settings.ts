import { apiGet, apiPost } from "./client";
import type { ApiResponse } from "../types";

export type SettingsData = {
  bank_balance: number;
  safety_margin: number;
};

export const fetchSettings = async (): Promise<SettingsData> => {
  const res = await apiGet<SettingsData>("/settings/get.php");
  return res.data;
};

export const updateSettings = async (payload: {
  safety_margin: number;
}): Promise<ApiResponse<unknown>> => {
  return apiPost<unknown>("/settings/update.php", payload);
};
