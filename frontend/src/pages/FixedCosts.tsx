import { useState, useCallback } from "react";
import AmountInput from "../components/AmountInput";
import ConfirmModal from "../components/ConfirmModal";
import toast from "react-hot-toast";
import type { FixedCost, TransactionType } from "../types";
import { useFixedCosts } from "../hooks/useFixedCosts";
import { useAccounts } from "../hooks/useAccounts";

const TYPE_LABELS: Record<TransactionType, string> = {
  deposit: "入金",
  transfer: "振替",
  payment: "支払い",
};

const TYPE_COLORS: Record<TransactionType, string> = {
  deposit: "bg-green-50 text-green-700",
  transfer: "bg-purple-50 text-purple-700",
  payment: "bg-red-50 text-red-700",
};

export default function FixedCosts() {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [type, setType] = useState<TransactionType>("payment");
  const [defaultAccountId, setDefaultAccountId] = useState<number | "">("");
  const [toAccountId, setToAccountId] = useState<number | "">("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [localEdits, setLocalEdits] = useState<Record<number, Partial<FixedCost>>>({});
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const { costs, isLoading, addMutation, updateMutation, toggleMutation, deleteMutation } = useFixedCosts();
  const { accounts } = useAccounts();

  const handleAdd = useCallback(() => {
    if (!name || amount <= 0) return;
    addMutation.mutate({
      name,
      type,
      default_amount: amount,
      default_account_id: defaultAccountId !== "" ? defaultAccountId : null,
      to_account_id: type === "transfer" && toAccountId !== "" ? toAccountId : null,
    }, {
      onSuccess: () => {
        toast.success("固定費を追加しました");
        setName("");
        setAmount(0);
        setType("payment");
        setDefaultAccountId("");
        setToAccountId("");
      },
      onError: () => toast.error("登録失敗"),
    });
  }, [name, amount, type, defaultAccountId, toAccountId, addMutation]);

  const handleUpdate = useCallback((id: number) => {
    const cost = costs.find((c) => c.id === id);
    if (!cost) return;
    const edited = { ...cost, ...localEdits[id] };
    updateMutation.mutate({
      id,
      name: edited.name,
      type: edited.type,
      default_amount: edited.default_amount,
      default_account_id: edited.default_account_id,
      to_account_id: edited.type === "transfer" ? edited.to_account_id : null,
    }, {
      onSuccess: () => { toast.success("更新しました"); setEditingId(null); setLocalEdits({}); },
    });
  }, [costs, localEdits, updateMutation]);

  const updateLocal = useCallback(<K extends keyof FixedCost>(id: number, field: K, value: FixedCost[K]) => {
    setLocalEdits((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }, []);

  if (isLoading) return <div className="p-6">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">固定費管理</h1>

      {/* 追加フォーム */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <div className="font-semibold">固定費追加</div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">名前</label>
            <input
              type="text"
              placeholder="例：家賃"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border px-3 py-2 rounded w-full"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">種別</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as TransactionType)}
              className="border px-3 py-2 rounded w-full"
            >
              <option value="payment">支払い</option>
              <option value="deposit">入金</option>
              <option value="transfer">振替</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">金額</label>
            <AmountInput
              value={amount}
              onChange={setAmount}
              placeholder="金額"
              className="border px-3 py-2 rounded w-full"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">{type === "transfer" ? "振替元口座" : "口座（任意）"}</label>
            <select
              value={defaultAccountId}
              onChange={(e) => setDefaultAccountId(e.target.value !== "" ? Number(e.target.value) : "")}
              className="border px-3 py-2 rounded w-full"
            >
              <option value="">選択してください</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          {type === "transfer" && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">振替先口座</label>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value !== "" ? Number(e.target.value) : "")}
                className="border px-3 py-2 rounded w-full"
              >
                <option value="">選択してください</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className={`flex items-end ${type === "transfer" ? "" : "sm:col-span-2"}`}>
            <button
              onClick={handleAdd}
              disabled={addMutation.isPending}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50 hover:bg-blue-600 transition-colors"
            >
              追加
            </button>
          </div>
        </div>
      </div>

      {/* 固定費一覧 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b font-semibold">固定費一覧</div>

        <ul className="divide-y divide-gray-100">
          {costs.length === 0 && (
            <li className="px-6 py-8 text-center text-sm text-gray-400">
              固定費が登録されていません
            </li>
          )}

          {costs.map((c) => {
            const editing = { ...c, ...localEdits[c.id] };

            if (editingId === c.id) {
              return (
                <li key={c.id} className="px-4 py-4 bg-gray-50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500">名前</label>
                      <input
                        value={editing.name}
                        onChange={(e) => updateLocal(c.id, "name", e.target.value)}
                        className="border px-2 py-1.5 rounded text-sm w-full"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500">種別</label>
                      <select
                        value={editing.type}
                        onChange={(e) => updateLocal(c.id, "type", e.target.value as TransactionType)}
                        className="border px-2 py-1.5 rounded text-sm w-full"
                      >
                        <option value="payment">支払い</option>
                        <option value="deposit">入金</option>
                        <option value="transfer">振替</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500">金額</label>
                      <AmountInput
                        value={editing.default_amount}
                        onChange={(v) => updateLocal(c.id, "default_amount", v)}
                        className="border px-2 py-1.5 rounded text-sm w-full"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500">{editing.type === "transfer" ? "振替元口座" : "口座（任意）"}</label>
                      <select
                        value={editing.default_account_id ?? ""}
                        onChange={(e) => updateLocal(c.id, "default_account_id", e.target.value !== "" ? Number(e.target.value) : null)}
                        className="border px-2 py-1.5 rounded text-sm w-full"
                      >
                        <option value="">選択してください</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                    </div>

                    {editing.type === "transfer" && (
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500">振替先口座</label>
                        <select
                          value={editing.to_account_id ?? ""}
                          onChange={(e) => updateLocal(c.id, "to_account_id", e.target.value !== "" ? Number(e.target.value) : null)}
                          className="border px-2 py-1.5 rounded text-sm w-full"
                        >
                          <option value="">選択してください</option>
                          {accounts.map((a) => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className={`flex items-end justify-end gap-2 ${editing.type === "transfer" ? "" : "sm:col-span-2"}`}>
                      <button
                        onClick={() => { setEditingId(null); setLocalEdits({}); }}
                        className="px-3 py-1.5 rounded border text-sm text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        キャンセル
                      </button>
                      <button
                        onClick={() => handleUpdate(c.id)}
                        disabled={updateMutation.isPending}
                        className="px-3 py-1.5 rounded bg-blue-500 text-white text-sm disabled:opacity-50 hover:bg-blue-600 transition-colors"
                      >
                        保存
                      </button>
                    </div>
                  </div>
                </li>
              );
            }

            const accountLabel = c.type === "transfer"
              ? `${accounts.find((a) => a.id === c.default_account_id)?.name ?? "未設定"} → ${accounts.find((a) => a.id === c.to_account_id)?.name ?? "未設定"}`
              : accounts.find((a) => a.id === c.default_account_id)?.name ?? null;

            return (
              <li key={c.id} className="px-4 py-3 flex flex-col gap-1.5 hover:bg-gray-50 transition-colors">
                {/* 上段: バッジ + 名前 / 金額 */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[c.type]}`}>
                      {TYPE_LABELS[c.type]}
                    </span>
                    <span className="font-semibold truncate">{c.name}</span>
                  </div>
                  <span className={`shrink-0 text-sm font-semibold ${c.type === "deposit" ? "text-green-600" : "text-red-600"}`}>
                    {c.type === "deposit" ? "+" : "-"}¥{c.default_amount.toLocaleString()}
                  </span>
                </div>

                {/* 下段: 口座 / 操作ボタン */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-400 truncate">
                    {accountLabel ?? <span className="text-gray-300">口座未設定</span>}
                  </span>
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => toggleMutation.mutate(c.id)}
                      className={`px-2.5 py-0.5 rounded text-xs ${
                        c.is_active ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {c.is_active ? "有効" : "無効"}
                    </button>
                    <button
                      onClick={() => setEditingId(c.id)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => setDeleteTargetId(c.id)}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      削除
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <ConfirmModal
        isOpen={deleteTargetId !== null}
        message="この固定費を削除しますか？進行中の月次から未払い分も削除されます。"
        onConfirm={() => {
          if (!deleteTargetId) return;
          deleteMutation.mutate(deleteTargetId, {
            onSuccess: () => { toast.success("削除しました"); setDeleteTargetId(null); },
            onError: (err: Error) => { toast.error(err.message); setDeleteTargetId(null); },
          });
        }}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
