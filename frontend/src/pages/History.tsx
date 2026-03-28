import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { fetchMonthlyHistory } from "../api/monthly";
import type { MonthSummary } from "../api/monthly";
import { useMonthly } from "../hooks/useMonthly";
import ConfirmModal from "../components/ConfirmModal";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function History() {
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const { data: months = [], isLoading } = useQuery<MonthSummary[]>({
    queryKey: ["monthly-history"],
    queryFn: fetchMonthlyHistory,
  });

  const { deleteMutation } = useMonthly();

  const handleDelete = () => {
    if (!deleteTargetId) return;
    deleteMutation.mutate(deleteTargetId, {
      onSuccess: () => { toast.success("削除しました"); setDeleteTargetId(null); },
      onError: (err: Error) => { toast.error(err.message); setDeleteTargetId(null); },
    });
  };

  if (isLoading) return <div>Loading...</div>;

  const chartData = [...months]
    .reverse()
    .map((m) => ({
      month: m.cycle_date,
      予定: Number(m.total_planned),
      実績: Number(m.total_actual),
    }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">履歴</h1>

      {chartData.length > 0 && (
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="text-lg font-semibold mb-4">月別固定費推移</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis
                tickFormatter={(v) => `¥${(v / 10000).toFixed(0)}万`}
                tick={{ fontSize: 12 }}
              />
              <Tooltip formatter={(value) => `¥${Number(value).toLocaleString()}`} />
              <Legend />
              <Bar dataKey="予定" fill="#93c5fd" />
              <Bar dataKey="実績" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white rounded-xl shadow">
        <table className="w-full">
          <thead className="bg-gray-50 text-sm text-gray-500">
            <tr>
              <th className="p-4 text-left">月</th>
              <th className="p-4 text-left">予定</th>
              <th className="p-4 text-left">実績</th>
              <th className="p-4"></th>
            </tr>
          </thead>

          <tbody>
            {Array.isArray(months) && months.map((m) => (
              <tr key={m.id} className="border-t">
                <td className="p-4">{m.cycle_date}</td>
                <td className="p-4 text-gray-500">¥{Number(m.total_planned).toLocaleString()}</td>
                <td className="p-4">¥{Number(m.total_actual).toLocaleString()}</td>
                <td className="p-4 text-right flex items-center justify-end gap-3">
                  <Link to={`/monthly/${m.id}`} className="text-blue-500 hover:underline">
                    詳細
                  </Link>
                  <button
                    onClick={() => setDeleteTargetId(m.id)}
                    className="text-red-400 hover:text-red-600 text-sm"
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={deleteTargetId !== null}
        message="この月次履歴を削除しますか？この操作は取り消せません。"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
