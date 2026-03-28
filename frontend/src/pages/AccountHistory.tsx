import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchAccountHistory } from "../api/accounts";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const TYPE_LABELS: Record<string, string> = {
  payment: "支払い",
  transfer: "振替",
  salary: "給与",
};

const TYPE_COLORS: Record<string, string> = {
  payment: "text-red-600",
  transfer: "text-blue-600",
  salary: "text-green-600",
};

export default function AccountHistory() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["account-history", id],
    queryFn: () => fetchAccountHistory(Number(id)),
    enabled: !!id,
  });

  if (isLoading) return <div className="p-6">Loading...</div>;
  if (!data) return <div className="p-6 text-gray-500">口座が見つかりません</div>;

  const { account, histories } = data;

  const chartData = [...histories]
    .reverse()
    .map((h) => ({
      date: new Date(h.created_at).toLocaleDateString("ja-JP", { month: "2-digit", day: "2-digit" }),
      残高: Number(h.balance_after),
    }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/accounts")}
          className="text-sm text-blue-500 hover:underline"
        >
          ← 口座一覧に戻る
        </button>
        <h1 className="text-2xl font-bold">{account.name} — 履歴</h1>
      </div>

      <div className="bg-white p-4 rounded-xl shadow text-sm text-gray-500">
        現在残高: <span className="font-bold text-gray-800 text-base">¥{Number(account.balance).toLocaleString()}</span>
      </div>

      {chartData.length > 1 && (
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="text-lg font-semibold mb-4">残高推移</h2>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis
                tickFormatter={(v) => `¥${(v / 10000).toFixed(0)}万`}
                tick={{ fontSize: 12 }}
              />
              <Tooltip formatter={(value) => `¥${Number(value).toLocaleString()}`} />
              <Area
                type="monotone"
                dataKey="残高"
                stroke="#3b82f6"
                fill="url(#balanceGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        {histories.length === 0 ? (
          <div className="p-6 text-gray-400">履歴がありません</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="p-3 text-left">日時</th>
                <th className="p-3 text-left">種別</th>
                <th className="p-3 text-left">摘要</th>
                <th className="p-3 text-right">変動</th>
                <th className="p-3 text-right">残高</th>
              </tr>
            </thead>
            <tbody>
              {histories.map((h) => (
                <tr key={h.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 text-gray-500">
                    {new Date(h.created_at).toLocaleString("ja-JP", {
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className={`p-3 font-semibold ${TYPE_COLORS[h.type] ?? "text-gray-700"}`}>
                    {TYPE_LABELS[h.type] ?? h.type}
                  </td>
                  <td className="p-3 text-gray-600">{h.reason ?? "—"}</td>
                  <td className={`p-3 text-right font-semibold ${h.change_amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {h.change_amount >= 0 ? "+" : ""}
                    ¥{Number(h.change_amount).toLocaleString()}
                  </td>
                  <td className="p-3 text-right text-gray-700">
                    ¥{Number(h.balance_after).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
