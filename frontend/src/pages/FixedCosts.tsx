import { useState, useCallback } from "react";
import AmountInput from "../components/AmountInput";
import toast from "react-hot-toast";
import type { FixedCost } from "../types";
import { useFixedCosts } from "../hooks/useFixedCosts";

export default function FixedCosts() {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [localEdits, setLocalEdits] = useState<Record<number, Partial<FixedCost>>>({});

  const { costs, isLoading, addMutation, updateMutation, toggleMutation } = useFixedCosts();

  const handleAdd = useCallback(() => {
    if (!name || amount <= 0) return;
    addMutation.mutate({ name, default_amount: amount }, {
      onSuccess: () => { toast.success("固定費を追加しました"); setName(""); setAmount(0); },
      onError: () => toast.error("登録失敗"),
    });
  }, [name, amount, addMutation]);

  const handleUpdate = useCallback((id: number) => {
    const cost = costs.find((c) => c.id === id);
    if (!cost) return;
    const edited = { ...cost, ...localEdits[id] };
    updateMutation.mutate({ id, name: edited.name, default_amount: edited.default_amount }, {
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

      <div className="bg-white p-6 rounded-xl shadow space-y-4">
        <div className="font-semibold">固定費追加</div>

        <div className="flex gap-4">
          <input
            type="text"
            placeholder="名前"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border px-3 py-2 rounded w-1/2"
          />

          <AmountInput
            value={amount}
            onChange={setAmount}
            placeholder="金額"
            className="border px-3 py-2 rounded w-1/3"
          />

          <button
            onClick={handleAdd}
            disabled={addMutation.isPending}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            追加
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow">
        <div className="p-6 border-b font-semibold">固定費一覧</div>

        <table className="w-full">
          <thead className="bg-gray-50 text-sm text-gray-500">
            <tr>
              <th className="p-4 text-left">名前</th>
              <th className="p-4 text-left">金額</th>
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
                      <AmountInput
                        value={editing.default_amount}
                        onChange={(v) => updateLocal(c.id, "default_amount", v)}
                        className="border px-2 py-1 rounded w-24"
                      />
                    ) : (
                      `¥${c.default_amount.toLocaleString()}`
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
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
