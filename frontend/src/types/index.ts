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
  balance: number;
};

export type TransactionType = "deposit" | "transfer" | "payment";

export type FixedCost = {
  id: number;
  name: string;
  type: TransactionType;
  default_amount: number;
  is_active: boolean;
  default_account_id: number | null;
  to_account_id: number | null;
};

export type MonthlyCycle = {
  id: number;
  cycle_date: string;
  status: "open" | "closed";
};

export type MonthlyCostItem = {
  id: number;
  name: string;
  type: TransactionType;
  amount: number;
  default_account_id: number | null;
  to_account_id: number | null;
  to_account_name: string | null;
  paid_amount: number | null;
  paid_date: string | null;
  account_name: string | null;
  account_id: number | null;
};

export type SpotTransaction = {
  id: number;
  type: TransactionType;
  account_id: number;
  account_name: string;
  to_account_id: number | null;
  to_account_name: string | null;
  amount: number;
  memo: string | null;
  transaction_date: string;
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
