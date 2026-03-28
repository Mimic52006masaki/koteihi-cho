import { useState, useCallback, memo } from "react";
import AmountInput from "../components/AmountInput";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import type { Account, MonthlyCostItem, SpotTransaction, TransactionType } from "../types";
import { fetchAccounts } from "../api/accounts";
import { useMonthly } from "../hooks/useMonthly";
import { createSpotTransaction, deleteSpotTransaction } from "../api/spot";

const today = () => new Date().toISOString().slice(0, 10);

const TYPE_LABELS: Record<TransactionType, string> = {
  deposit: "入金",
  transfer: "振替",
  payment: "支払い",
};

const TYPE_COLORS: Record<TransactionType, string> = {
  deposit: "bg-green-100 text-green-700",
  transfer: "bg-blue-100 text-blue-700",
  payment: "bg-orange-100 text-orange-700",
};

const EXEC_LABELS: Record<TransactionType, string> = {
  deposit: "入金実行",
  transfer: "振替実行",
  payment: "支払い確定",
};

// ---- 固定費の型 ----
type Cost = MonthlyCostItem & { input_amount?: number };

// ---- 振替シミュレーター ----
function TransferSimulator({
  accounts,
  onTransfer,
  isPending,
}: {
  accounts: Account[];
  onTransfer: (data: { account_id: number; to_account_id: number; amount: number; transaction_date: string }) => void;
  isPending: boolean;
}) {
  const [fromId, setFromId] = useState<number | "">("");
  const [toId, setToId] = useState<number | "">("");
  const [amount, setAmount] = useState(0);

  const fromAccount = fromId !== "" ? accounts.find((a) => a.id === fromId) : null;
  const toAccount = toId !== "" ? accounts.find((a) => a.id === toId) : null;
  const showPreview = amount > 0 && (fromAccount || toAccount);
  const simulatedFrom = fromAccount ? fromAccount.balance - amount : null;
  const simulatedTo = toAccount ? toAccount.balance + amount : null;
  const isOverdraft = simulatedFrom !== null && simulatedFrom < 0;
  const canSubmit = fromId !== "" && toId !== "" && fromId !== toId && amount > 0;

  const handleSubmit = () => {
    onTransfer({
      account_id: fromId as number,
      to_account_id: toId as number,
      amount,
      transaction_date: today(),
    });
  };

  return (
    <div className="bg-white rounded-xl shadow p-5 space-y-4">
      <div className="font-semibold text-gray-800">振替シミュレーター</div>

      <div className="flex gap-3 flex-wrap items-end">
        <div>
          <label className="text-xs text-gray-500 block mb-1">振替元</label>
          <select
            value={fromId}
            onChange={(e) => setFromId(e.target.value !== "" ? Number(e.target.value) : "")}
            className="border px-3 py-2 rounded text-sm"
          >
            <option value="">口座を選択</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>

        <div className="text-gray-400 pb-2">→</div>

        <div>
          <label className="text-xs text-gray-500 block mb-1">振替先</label>
          <select
            value={toId}
            onChange={(e) => setToId(e.target.value !== "" ? Number(e.target.value) : "")}
            className="border px-3 py-2 rounded text-sm"
          >
            <option value="">口座を選択</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-500 block mb-1">金額</label>
          <AmountInput
            value={amount}
            onChange={setAmount}
            className="border px-3 py-2 rounded text-sm w-32"
          />
        </div>
      </div>

      {showPreview && (
        <div className="flex gap-6 bg-gray-50 rounded-lg p-4">
          {fromAccount && simulatedFrom !== null && (
            <div className="space-y-1">
              <div className="text-sm font-medium text-gray-700">{fromAccount.name}</div>
              <div className="text-xs text-gray-400">現在: ¥{fromAccount.balance.toLocaleString()}</div>
              <div className={`text-sm font-bold ${isOverdraft ? "text-red-600" : "text-gray-800"}`}>
                → ¥{simulatedFrom.toLocaleString()}
                {isOverdraft && <span className="ml-1 text-xs font-normal">残高不足</span>}
              </div>
            </div>
          )}
          {fromAccount && toAccount && (
            <div className="border-l border-gray-200 self-stretch" />
          )}
          {toAccount && simulatedTo !== null && (
            <div className="space-y-1">
              <div className="text-sm font-medium text-gray-700">{toAccount.name}</div>
              <div className="text-xs text-gray-400">現在: ¥{toAccount.balance.toLocaleString()}</div>
              <div className="text-sm font-bold text-green-600">
                → ¥{simulatedTo.toLocaleString()}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || isPending}
          className="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600 disabled:opacity-50"
        >
          振替実行
        </button>
      </div>
    </div>
  );
}

// ---- 実行モーダル ----
function PayModal({
  cost,
  accounts,
  onClose,
  onConfirm,
  isPending,
}: {
  cost: Cost;
  accounts: Account[];
  onClose: () => void;
  onConfirm: (cost: Cost) => void;
  isPending: boolean;
}) {
  const type = cost.type ?? "payment";
  const [date, setDate] = useState(cost.paid_date ?? today());
  const [accountId, setAccountId] = useState<number | "">(
    cost.account_id ?? cost.default_account_id ?? ""
  );
  const [inputAmount, setInputAmount] = useState(cost.amount);

  const handleConfirm = () => {
    onConfirm({
      ...cost,
      paid_date: date,
      account_id: accountId !== "" ? accountId : null,
      input_amount: inputAmount,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-lg">{cost.name}</h2>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[type]}`}>
            {TYPE_LABELS[type]}
          </span>
        </div>

        <div>
          <label className="text-sm font-medium">日付</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border px-3 py-2 rounded w-full mt-1"
          />
        </div>

        {type !== "transfer" ? (
          <div>
            <label className="text-sm font-medium">
              {type === "deposit" ? "入金先口座" : "支払元口座"}
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value !== "" ? Number(e.target.value) : "")}
              className="border px-3 py-2 rounded w-full mt-1"
            >
              <option value="">口座選択</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="text-sm text-gray-600 bg-blue-50 rounded p-3">
            {accounts.find(a => a.id === (cost.account_id ?? cost.default_account_id))?.name ?? "振替元未設定"}
            {" → "}
            {cost.to_account_name ?? "振替先未設定"}
          </div>
        )}

        <div>
          <label className="text-sm font-medium">金額</label>
          <AmountInput
            value={inputAmount}
            onChange={setInputAmount}
            className="border px-3 py-2 rounded w-full mt-1"
          />
        </div>

        <div className="flex gap-3 justify-end pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded border text-gray-600"
          >
            キャンセル
          </button>
          <button
            onClick={handleConfirm}
            disabled={isPending}
            className="px-4 py-2 rounded bg-blue-500 text-white disabled:opacity-50"
          >
            {EXEC_LABELS[type]}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- 固定費行 ----
const CostCard = memo(function CostCard({
  cost,
  onOpenModal,
  onUnpay,
  unpayPending,
}: {
  cost: Cost;
  onOpenModal: (id: number) => void;
  onUnpay: (id: number) => void;
  unpayPending: boolean;
}) {
  const isPaid = cost.paid_amount !== null;
  const type = cost.type ?? "payment";

  if (isPaid) {
    return (
      <div className="p-4 rounded-lg shadow bg-green-50 border border-green-200">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[type]}`}>
              {TYPE_LABELS[type]}
            </span>
            <span className="font-semibold">{cost.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-green-700 font-bold text-sm">✔ 実行済み</span>
            <button
              onClick={() => onUnpay(cost.id)}
              disabled={unpayPending}
              className="text-sm text-blue-500 hover:underline disabled:opacity-50"
            >
              ↺ 取り消す
            </button>
          </div>
        </div>
        <div className="text-sm text-gray-500 mt-2 flex gap-4">
          <span>{cost.paid_date ?? "N/A"}</span>
          <span>¥{Number(cost.paid_amount).toLocaleString()}</span>
          {type !== "deposit" && cost.account_name && <span>{cost.account_name}</span>}
          {type === "transfer" && cost.to_account_name && <span>→ {cost.to_account_name}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg shadow bg-white flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[type]}`}>
          {TYPE_LABELS[type]}
        </span>
        <span className="font-semibold">{cost.name}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-gray-400 text-sm">{today()}</span>
        <span className="text-gray-500 text-sm">¥{cost.amount.toLocaleString()}</span>
        <button
          onClick={() => onOpenModal(cost.id)}
          className="bg-blue-500 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-600"
        >
          実行
        </button>
      </div>
    </div>
  );
});

// ---- 臨時追加モーダル ----
function SpotModal({
  accounts,
  onClose,
  onSubmit,
  isPending,
}: {
  accounts: Account[];
  onClose: () => void;
  onSubmit: (data: {
    type: TransactionType;
    account_id: number;
    to_account_id?: number;
    amount: number;
    memo: string;
    transaction_date: string;
  }) => void;
  isPending: boolean;
}) {
  const [type, setType] = useState<TransactionType>("payment");
  const [accountId, setAccountId] = useState<number | "">("");
  const [toAccountId, setToAccountId] = useState<number | "">("");
  const [amount, setAmount] = useState(0);
  const [memo, setMemo] = useState("");
  const [date, setDate] = useState(today());

  const handleSubmit = () => {
    if (!accountId || amount <= 0) {
      toast.error("口座と金額を入力してください");
      return;
    }
    if (type === "transfer" && !toAccountId) {
      toast.error("振替先口座を選択してください");
      return;
    }
    onSubmit({
      type,
      account_id: accountId as number,
      to_account_id: type === "transfer" ? (toAccountId as number) : undefined,
      amount,
      memo,
      transaction_date: date,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
        <h2 className="font-bold text-lg">臨時トランザクション追加</h2>

        <div>
          <label className="text-sm font-medium">種別</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TransactionType)}
            className="border px-3 py-2 rounded w-full mt-1"
          >
            <option value="payment">支払い</option>
            <option value="deposit">入金</option>
            <option value="transfer">振替</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">
            {type === "deposit" ? "入金先口座" : type === "transfer" ? "振替元口座" : "支払元口座"}
          </label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value !== "" ? Number(e.target.value) : "")}
            className="border px-3 py-2 rounded w-full mt-1"
          >
            <option value="">口座選択</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>

        {type === "transfer" && (
          <div>
            <label className="text-sm font-medium">振替先口座</label>
            <select
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value !== "" ? Number(e.target.value) : "")}
              className="border px-3 py-2 rounded w-full mt-1"
            >
              <option value="">口座選択</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="text-sm font-medium">金額</label>
          <AmountInput
            value={amount}
            onChange={setAmount}
            className="border px-3 py-2 rounded w-full mt-1"
          />
        </div>

        <div>
          <label className="text-sm font-medium">メモ（任意）</label>
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="例：医療費、ボーナス"
            className="border px-3 py-2 rounded w-full mt-1"
          />
        </div>

        <div>
          <label className="text-sm font-medium">日付</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border px-3 py-2 rounded w-full mt-1"
          />
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded border text-gray-600">
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="px-4 py-2 rounded bg-blue-500 text-white disabled:opacity-50"
          >
            追加
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- メインページ ----
export default function CurrentMonthly() {
  const [payModalCostId, setPayModalCostId] = useState<number | null>(null);
  const [showSpotModal, setShowSpotModal] = useState(false);
  const [tab, setTab] = useState<"unpaid" | "paid">("unpaid");

  const { monthly, isSuccess, payMutation, unpayMutation } = useMonthly();
  const queryClient = useQueryClient();

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ["accounts"],
    queryFn: fetchAccounts,
  });

  const spotMutation = useMutation({
    mutationFn: createSpotTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-monthly"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setShowSpotModal(false);
      toast.success("追加しました");
    },
    onError: () => toast.error("追加に失敗しました"),
  });

  const deleteSpotMutation = useMutation({
    mutationFn: deleteSpotTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-monthly"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("削除しました");
    },
    onError: () => toast.error("削除に失敗しました"),
  });

  const allCosts: Cost[] = (monthly?.items ?? []).map((c) => ({ ...c }));
  const unpaidCosts = allCosts.filter((c) => c.paid_amount === null);
  const paidCosts = allCosts.filter((c) => c.paid_amount !== null);
  const visibleCosts = tab === "unpaid" ? unpaidCosts : paidCosts;

  const payModalCost = payModalCostId !== null
    ? allCosts.find((c) => c.id === payModalCostId) ?? null
    : null;

  const handlePay = useCallback((cost: Cost) => {
    const amount = cost.input_amount ?? cost.amount;
    const type = cost.type ?? "payment";
    const accountId = cost.account_id ?? cost.default_account_id;

    if (!cost.paid_date || amount <= 0) {
      toast.error("金額と日付を入力してください");
      return;
    }
    if (type !== "transfer" && !accountId) {
      toast.error("口座を選択してください");
      return;
    }

    payMutation.mutate(
      {
        monthly_fixed_cost_id: cost.id,
        account_id: accountId ?? 0,
        amount,
        paid_date: cost.paid_date ?? today(),
      },
      {
        onSuccess: () => setPayModalCostId(null),
        onError: () => toast.error("処理に失敗しました"),
      }
    );
  }, [payMutation]);

  const handleUnpay = useCallback((id: number) => {
    unpayMutation.mutate(id, { onError: () => toast.error("処理に失敗しました") });
  }, [unpayMutation]);

  if (isSuccess && !monthly) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">今月の固定費</h1>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center text-gray-500">
          <p className="text-lg">進行中の月次がありません</p>
          <p className="text-sm mt-1">ダッシュボードから新しい月を開始してください</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">今月の固定費</h1>
        {monthly && (
          <span className="text-sm text-gray-500">開始日: {monthly.cycle_date}</span>
        )}
      </div>

      {/* 振替シミュレーター */}
      <TransferSimulator
        accounts={accounts}
        onTransfer={({ account_id, to_account_id, amount, transaction_date }) =>
          spotMutation.mutate({ type: "transfer", account_id, to_account_id, amount, memo: "振替", transaction_date })
        }
        isPending={spotMutation.isPending}
      />

      {/* タブ */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab("unpaid")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${
            tab === "unpaid" ? "bg-white shadow text-gray-800" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          未払い ({unpaidCosts.length}件)
        </button>
        <button
          onClick={() => setTab("paid")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${
            tab === "paid" ? "bg-white shadow text-gray-800" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          実行済み ({paidCosts.length}件)
        </button>
      </div>

      {/* 固定費一覧 */}
      <div className="space-y-3">
        {visibleCosts.length === 0 ? (
          <div className="bg-white rounded-lg p-6 text-center text-gray-400 text-sm">
            {tab === "unpaid" ? "未払いの固定費はありません" : "実行済みの固定費はありません"}
          </div>
        ) : (
          visibleCosts.map((c) => (
            <CostCard
              key={c.id}
              cost={c}
              onOpenModal={setPayModalCostId}
              onUnpay={handleUnpay}
              unpayPending={unpayMutation.isPending}
            />
          ))
        )}
      </div>

      {/* 臨時トランザクション */}
      <div className="bg-white rounded-xl shadow">
        <div className="p-4 border-b flex justify-between items-center">
          <span className="font-semibold">臨時トランザクション</span>
          <button
            onClick={() => setShowSpotModal(true)}
            className="bg-blue-500 text-white px-3 py-1.5 rounded text-sm"
          >
            + 臨時追加
          </button>
        </div>

        {(monthly?.spots ?? []).length === 0 ? (
          <p className="p-4 text-sm text-gray-400">臨時トランザクションはありません</p>
        ) : (
          <ul className="divide-y">
            {(monthly?.spots ?? []).map((s: SpotTransaction) => (
              <li key={s.id} className="p-4 flex justify-between items-center">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[s.type]}`}>
                      {TYPE_LABELS[s.type]}
                    </span>
                    <span className="font-medium">{s.memo || "—"}</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {s.account_name}
                    {s.type === "transfer" && s.to_account_name ? ` → ${s.to_account_name}` : ""}
                    　{s.transaction_date}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-semibold ${s.type === "deposit" ? "text-green-600" : "text-gray-800"}`}>
                    {s.type === "deposit" ? "+" : s.type === "payment" ? "-" : ""}¥{s.amount.toLocaleString()}
                  </span>
                  <button
                    onClick={() => deleteSpotMutation.mutate(s.id)}
                    disabled={deleteSpotMutation.isPending}
                    className="text-red-400 text-sm hover:text-red-600 disabled:opacity-50"
                  >
                    削除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {payModalCost && (
        <PayModal
          cost={payModalCost}
          accounts={accounts}
          onClose={() => setPayModalCostId(null)}
          onConfirm={handlePay}
          isPending={payMutation.isPending}
        />
      )}

      {showSpotModal && (
        <SpotModal
          accounts={accounts}
          onClose={() => setShowSpotModal(false)}
          onSubmit={(data) => spotMutation.mutate(data)}
          isPending={spotMutation.isPending}
        />
      )}
    </div>
  );
}
