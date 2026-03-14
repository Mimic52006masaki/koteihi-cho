import { useEffect, useState } from "react";
import { api } from "../api/client";

type FixedCost = {
  id: number;
  name: string;
  default_amount: number;
  is_active: number;
};

export default function FixedCosts() {
  const [costs, setCosts] = useState<FixedCost[]>([]);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState<number>(0);

  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    loadCosts();
  }, []);

  const loadCosts = async () => {
    const res = await api.get("/fixed-costs/index.php");
    setCosts(res.data.data);
  };

  const addCost = async () => {
    if (!name || amount <= 0) return;
    try {
      await api.post("/fixed-costs/store.php", {
        name,
        default_amount: amount,
      });
      setName("");
      setAmount(0);
  
      loadCosts();
    } catch (e) {
      alert("登録失敗");
    }
  };

  const toggleCost = async (id: number) => {
    await api.post("/fixed-costs/toggle.php", { id });
    loadCosts();
  };

  const updateCost = async (id: number) => {
    const cost = costs.find((c) => c.id === id);
    if (!cost) return;

    await api.post("/fixed-costs/update.php", {
      id,
      name: cost.name,
      default_amount: cost.default_amount,
    });
    setEditingId(null);
    loadCosts();
  };

  const updateLocal = (id: number, field: string, value: any) => {
    setCosts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">固定費管理</h1>

      {/* add form */}

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

          <input
            type="number"
            placeholder="金額"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="border px-3 py-2 rounded w-1/3"
          />

          <button
            onClick={addCost}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            追加
          </button>
        </div>
      </div>

      {/* list */}

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
            {costs.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-4">
                  {editingId === c.id ? (
                    <input
                      value={c.name}
                      onChange={(e) =>
                        updateLocal(c.id, "name", e.target.value)
                      }
                      className="border px-2 py-1 rounded"
                    />
                  ) : (
                    c.name
                  )}
                </td>

                <td className="p-4">
                  {editingId === c.id ? (
                    <input
                      type="number"
                      value={c.default_amount}
                      onChange={(e) =>
                        updateLocal(
                          c.id,
                          "default_amount",
                          Number(e.target.value),
                        )
                      }
                      className="border px-2 py-1 rounded w-24"
                    />
                  ) : (
                    `¥${c.default_amount.toLocaleString()}`
                  )}
                </td>

                <td className="p-4 text-center">
                  <button
                    onClick={() => toggleCost(c.id)}
                    className={`px-3 py-1 rounded text-sm ${
                      c.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {c.is_active ? "有効" : "無効"}
                  </button>
                </td>

                <td className="p-4 text-right">
                  {editingId === c.id ? (
                    <button
                      onClick={() => updateCost(c.id)}
                      className="text-blue-500"
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
