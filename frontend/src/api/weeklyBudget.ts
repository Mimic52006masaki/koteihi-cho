import { apiGet, apiPost } from "./client";

export type WeeklyBudgetSetting = {
  week_start: string;
  budget_amount: number;
  next_week_start: string;
  next_budget_amount: number;
};

export const fetchWeeklyBudget = async (): Promise<WeeklyBudgetSetting> =>
  (await apiGet<WeeklyBudgetSetting>("/dashboard/weekly-budget.php")).data;

export const updateWeeklyBudget = async (budgetAmount: number): Promise<WeeklyBudgetSetting> =>
  (await apiPost<WeeklyBudgetSetting>("/dashboard/weekly-budget.php", { budget_amount: budgetAmount })).data;
