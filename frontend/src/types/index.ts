export type ApiResponse<T> = {
  success: boolean;
  data: T;
  error: string | null;
};

export type User = {
  id: number;
  name: string;
};

export type Account = {
  id: number;
  name: string;
  type: "asset" | "payment";
  balance: number;
};

export type FixedCost = {
  id: number;
  name: string;
  default_amount: number;
  is_active: boolean;
  default_account_id: number | null;
};

export type MonthlyCycle = {
  id: number;
  cycle_date: string;
  status: "open" | "closed";
  salary: number;
  salary_account_id: number | null;
};

export type MonthlyFixedCost = {
  id: number;
  fixed_cost_id: number;
  name: string;
  amount: number;
  actual_amount: number | null;
};

export type Payment = {
  id: number;
  monthly_fixed_cost_id: number;
  account_id: number;
  amount: number;
  paid_date: string;
  status: "paid" | "unpaid" | "skipped";
};

export type TransferHistory = {
  id: number;
  from_account_id: number;
  to_account_id: number;
  from_account_name: string;
  to_account_name: string;
  amount: number;
  transferred_at: string;
};

export type SalaryLog = {
  id: number;
  user_id: number;
  monthly_cycle_id: number;
  amount: number;
  received_at: string;
};
