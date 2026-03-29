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
  deposit: "bg-green-100 text-green-700",
  transfer: "bg-blue-100 text-blue-700",
  payment: "bg-orange-100 text-orange-700",
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
      <div className="bg-white p-6 rounded-xl shadow space-y-4">
        <div className="font-semibold">固定費追加</div>

        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            placeholder="名前"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border px-3 py-2 rounded w-48"
          />

          <select
            value={type}
            onChange={(e) => setType(e.target.value as TransactionType)}
            className="border px-3 py-2 rounded"
          >
            <option value="payment">支払い</option>
            <option value="deposit">入金</option>
            <option value="transfer">振替</option>
          </select>

          <AmountInput
            value={amount}
            onChange={setAmount}
            placeholder="金額"
            className="border px-3 py-2 rounded w-32"
          />

          <select
            value={defaultAccountId}
            onChange={(e) => setDefaultAccountId(e.target.value !== "" ? Number(e.target.value) : "")}
            className="border px-3 py-2 rounded"
          >
            <option value="">{type === "transfer" ? "振替元口座" : "口座（任意）"}</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>

          {type === "transfer" && (
            <select
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value !== "" ? Number(e.target.value) : "")}
              className="border px-3 py-2 rounded"
            >
              <option value="">振替先口座</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          )}

          <button
            onClick={handleAdd}
            disabled={addMutation.isPending}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            追加
          </button>
        </div>
      </div>

      {/* 固定費一覧 */}
      <div className="bg-white rounded-xl shadow">
        <div className="p-6 border-b font-semibold">固定費一覧</div>

        <table className="w-full">
          <thead className="bg-gray-50 text-sm text-gray-500">
            <tr>
              <th className="p-4 text-left">名前</th>
              <th className="p-4 text-left">種別</th>
              <th className="p-4 text-left">金額</th>
              <th className="p-4 text-left">口座</th>
              <th className="p-4">状態</th>
              <th className="p-4"></th>
            </tr>
          </thead>

          <tbody>
            {costs.map((c) => {
              const editing = { ...c, ...localEdits[c.id] };
              return (
                <tr key={c.id} className="border-t">
                  <td className="p-4">
                    {editingId === c.id ? (
                      <input
                        value={editing.name}
                        onChange={(e) => updateLocal(c.id, "name", e.target.value)}
                        className="border px-2 py-1 rounded"
                      />
                    ) : (
                      c.name
                    )}
                  </td>

                  <td className="p-4">
                    {editingId === c.id ? (
                      <select
                        value={editing.type}
                        onChange={(e) => updateLocal(c.id, "type", e.target.value as TransactionType)}
                        className="border px-2 py-1 rounded text-sm"
                      >
                        <option value="payment">支払い</option>
                        <option value="deposit">入金</option>
                        <option value="transfer">振替</option>
                      </select>
                    ) : (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${TYPE_COLORS[c.type]}`}>
                        {TYPE_LABELS[c.type]}
                      </span>
                    )}
                  </td>

                  <td className="p-4">
                    {editingId === c.id ? (
                      <AmountInput
                        value={editing.default_amount}
                        onChange={(v) => updateLocal(c.id, "default_amount", v)}
                        className="border px-2 py-1 rounded w-24"
                      />
                    ) : (
                      `¥${c.default_amount.toLocaleString()}`
                    )}
                  </td>

                  <td className="p-4 text-sm text-gray-600">
                    {c.type === "transfer" ? (
                      <>
                        {accounts.find((a) => a.id === c.default_account_id)?.name ?? "未設定"}
                        {" → "}
                        {accounts.find((a) => a.id === c.to_account_id)?.name ?? "未設定"}
                      </>
                    ) : (
                      accounts.find((a) => a.id === c.default_account_id)?.name ?? (
                        <span className="text-gray-300">未設定</span>
                      )
                    )}
                  </td>

                  <td className="p-4 text-center">
                    <button
                      onClick={() => toggleMutation.mutate(c.id)}
                      className={`px-3 py-1 rounded text-sm ${
                        c.is_active ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {c.is_active ? "有効" : "無効"}
                    </button>
                  </td>

                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {editingId === c.id ? (
                        <button
                          onClick={() => handleUpdate(c.id)}
                          disabled={updateMutation.isPending}
                          className="text-blue-500 disabled:opacity-50"
                        >
                          保存
                        </button>
                      ) : (
                        <button
                          onClick={() => setEditingId(c.id)}
                          className="text-gray-500"
                        >
                          編集
                        </button>
                      )}
                      {editingId !== c.id && (
                        <button
                          onClick={() => setDeleteTargetId(c.id)}
                          className="text-red-400 hover:text-red-600 text-sm"
                        >
                          削除
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
