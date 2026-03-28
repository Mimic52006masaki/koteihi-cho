import { useState, useCallback, memo } from "react";
import AmountInput from "../components/AmountInput";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import type { Account } from "../types";
import { fetchAccounts } from "../api/accounts";
import { useMonthly } from "../hooks/useMonthly";
import type { MonthlyCostItem } from "../api/monthly";

type Cost = MonthlyCostItem & { input_amount?: number };

// カードを memo 化：自分に関係する localEdits が変わった時だけ再レンダリング
const CostCard = memo(function CostCard({
  cost,
  accounts,
  isClosed,
  onPay,
  onUnpay,
  onLocalChange,
  payPending,
  unpayPending,
}: {
  cost: Cost;
  accounts: Account[];
  isClosed: boolean;
  onPay: (cost: Cost) => void;
  onUnpay: (id: number) => void;
  onLocalChange: <K extends keyof Cost>(id: number, field: K, value: Cost[K]) => void;
  payPending: boolean;
  unpayPending: boolean;
}) {
  return (
    <div
      className={`p-4 rounded-lg shadow ${
        cost.paid_amount !== null ? "bg-green-50 border border-green-200" : "bg-white"
      }`}
    >
      <div className="flex justify-between items-center">
        <span className="font-semibold text-lg">{cost.name}</span>
        <span className="text-gray-500">予定額: ¥{cost.amount.toLocaleString()}</span>
      </div>

      <div className="mt-4">
        {cost.paid_amount !== null ? (
          <div>
            <div className="flex justify-between items-center">
              <p className="text-green-700 font-bold">✔ 支払済み</p>
              {!isClosed && (
                <button
                  onClick={() => onUnpay(cost.id)}
                  disabled={unpayPending}
                  className="text-sm text-blue-500 hover:underline disabled:opacity-50"
                >
                  ↺ 未払いに戻す
                </button>
              )}
            </div>
            <div className="text-sm text-gray-700 mt-2 space-y-1">
              <p>支払日: {cost.paid_date ?? "N/A"}</p>
              <p>金額: ¥{Number(cost.paid_amount).toLocaleString()}</p>
              <p>口座: {cost.account_name ?? "N/A"}</p>
            </div>
          </div>
        ) : (
          <>
            {isClosed ? (
              <>
                <div className="bg-gray-50 border border-gray-200 rounded p-3 text-sm text-gray-600">
                  この月は締め済みのため編集できません
                </div>
                <p className="text-xs text-gray-400 mt-1">未払い項目は次月で調整してください</p>
              </>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">支払日</label>
                  <input
                    type="date"
                    value={cost.paid_date ?? ""}
                    onChange={(e) => onLocalChange(cost.id, "paid_date", e.target.value)}
                    className="border px-2 py-1 w-full mt-1 rounded"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">支払口座</label>
                  <select
                    value={cost.account_id ?? ""}
                    onChange={(e) =>
                      onLocalChange(cost.id, "account_id", e.target.value ? Number(e.target.value) : null)
                    }
                    className="border px-2 py-1 w-full mt-1 rounded"
                  >
                    <option value="">口座選択</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">支払金額</label>
                  <AmountInput
                    value={cost.input_amount ?? 0}
                    onChange={(v) => onLocalChange(cost.id, "input_amount", v)}
                    className="border px-2 py-1 w-full mt-1 rounded"
                  />
                </div>
                <div className="text-right">
                  <button
                    onClick={() => onPay(cost)}
                    disabled={payPending}
                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
                  >
                    確定
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
});

export default function CurrentMonthly() {
  const [localEdits, setLocalEdits] = useState<Record<number, Partial<Cost>>>({});

  const { monthly, isSuccess, payMutation, unpayMutation } = useMonthly();
  const isClosed = monthly?.status === "closed";

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ["accounts"],
    queryFn: fetchAccounts,
  });

  const costs: Cost[] = (monthly?.items ?? []).map((c) => ({
    ...c,
    ...localEdits[c.id],
    input_amount: localEdits[c.id]?.input_amount ?? c.amount,
  }));

  const handleLocalChange = useCallback(<K extends keyof Cost>(id: number, field: K, value: Cost[K]) => {
    setLocalEdits((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }, []);

  const handlePay = useCallback((cost: Cost) => {
    const amount = cost.input_amount ?? 0;
    if (!cost.account_id || !cost.paid_date || amount <= 0) {
      toast.error("口座、金額、支払日をすべて入力してください。");
      return;
    }
    payMutation.mutate(
      { monthly_fixed_cost_id: cost.id, account_id: cost.account_id, amount, paid_date: cost.paid_date },
      { onError: () => toast.error("支払登録に失敗しました") }
    );
  }, [payMutation]);

  const handleUnpay = useCallback((id: number) => {
    unpayMutation.mutate(id, { onError: () => toast.error("処理に失敗しました") });
  }, [unpayMutation]);

  if (isSuccess && !monthly) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4">今月の固定費</h1>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center text-gray-500">
          <p className="text-lg">進行中の月次がありません</p>
          <p className="text-sm mt-1">ダッシュボードから新しい月を開始してください</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">今月の固定費</h1>
      <div className="space-y-4">
        {costs.map((c) => (
          <CostCard
            key={c.id}
            cost={c}
            accounts={accounts}
            isClosed={isClosed}
            onPay={handlePay}
            onUnpay={handleUnpay}
            onLocalChange={handleLocalChange}
            payPending={payMutation.isPending}
            unpayPending={unpayMutation.isPending}
          />
        ))}
      </div>
    </div>
  );
}
