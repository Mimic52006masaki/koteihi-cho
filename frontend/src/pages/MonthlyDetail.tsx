import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";

type MonthlyItem = {
  id: number;
  name: string;
  amount: number;
  actual_amount: number | null;
};

export default function MonthlyDetail() {
  const { id } = useParams(); // 2026-03

  const [items, setItems] = useState<MonthlyItem[]>([]);
  const [loading, setLoading] = useState(true);
  // const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await api.get(`/monthly/history-detail.php?id=${id}`);
        if (res.data.success) {
          setItems(res.data.data.items);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  const totalPlanned = items.reduce((sum, i) => sum + Number(i.amount), 0);

  const totalActual = items.reduce(
    (sum, i) => sum + Number(i.actual_amount ?? 0),
    0,
  );

  const diff = totalActual - totalPlanned;

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{id} 固定費</h1>

      <div className="bg-white rounded-xl shadow">
        <table className="w-full">
          <thead className="bg-gray-50 text-sm text-gray-500">
            <tr>
              <th>固定費</th>
              <th>予定</th>
              <th>実績</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-4">{item.name}</td>
                <td className="p-4">¥{item.amount.toLocaleString()}</td>
                <td className="p-4">
                  ¥{Number(item.actual_amount ?? 0).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="p-6 border-t space-y-2">
          <div className="flex justify-between">
            <span>予定合計</span>
            <span>¥{totalPlanned.toLocaleString()}</span>
          </div>

          <div
            className={`flex justify-between font-semibold ${
              diff > 0 ? "text-red-500" : "text-green-600"
            }`}
          >
            <span>差額</span>
            <span>¥{diff.toLocaleString()}</span>
          </div>
        </div>
      </div>

    </div>
  );
}
