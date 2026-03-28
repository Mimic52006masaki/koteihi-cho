import { useQuery } from "@tanstack/react-query";
import { fetchMonthlyHistory } from "../api/monthly";
import type { MonthSummary } from "../api/monthly";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type YearSummary = {
  year: string;
  total: number;
  monthCount: number;
  average: number;
};

export default function Analytics() {
  const { data: months = [], isLoading } = useQuery<MonthSummary[]>({
    queryKey: ["monthly-history"],
    queryFn: fetchMonthlyHistory,
  });

  if (isLoading) return <div>Loading...</div>;

  // 月別推移チャートデータ（古い順）
  const chartData = [...months].reverse().map((m) => ({
    month: m.cycle_date,
    予定: Number(m.total_planned),
    実績: Number(m.total_actual),
    差分: Number(m.total_actual) - Number(m.total_planned),
  }));

  // 年次サマリー
  const yearMap: Record<string, { total: number; planned: number; count: number }> = {};
  months.forEach((m) => {
    const year = m.cycle_date.slice(0, 4);
    if (!yearMap[year]) yearMap[year] = { total: 0, planned: 0, count: 0 };
    yearMap[year].total += Number(m.total_actual);
    yearMap[year].planned += Number(m.total_planned);
    yearMap[year].count += 1;
  });

  const yearSummaries: YearSummary[] = Object.entries(yearMap)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([year, v]) => ({
      year,
      total: v.total,
      monthCount: v.count,
      average: Math.round(v.total / v.count),
    }));

  // 前月比
  const latest = months[0];
  const prev = months[1];
  const diff = latest && prev
    ? Number(latest.total_actual) - Number(prev.total_actual)
    : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">分析</h1>

      {/* サマリーカード */}
      {latest && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-sm text-gray-500">最新月 実績</div>
            <div className="text-2xl font-bold mt-1">
              ¥{Number(latest.total_actual).toLocaleString()}
            </div>
            <div className="text-xs text-gray-400 mt-1">{latest.cycle_date}</div>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-sm text-gray-500">前月比</div>
            {diff !== null ? (
              <div className={`text-2xl font-bold mt-1 ${diff > 0 ? "text-red-500" : diff < 0 ? "text-green-500" : "text-gray-700"}`}>
                {diff >= 0 ? "+" : ""}¥{diff.toLocaleString()}
              </div>
            ) : (
              <div className="text-2xl font-bold mt-1 text-gray-400">—</div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-sm text-gray-500">全期間 月平均</div>
            <div className="text-2xl font-bold mt-1">
              {months.length > 0
                ? `¥${Math.round(months.reduce((s, m) => s + Number(m.total_actual), 0) / months.length).toLocaleString()}`
                : "—"}
            </div>
            <div className="text-xs text-gray-400 mt-1">{months.length} ヶ月分</div>
          </div>
        </div>
      )}

      {/* 月別推移グラフ */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="text-lg font-semibold mb-4">月別固定費推移</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis
                tickFormatter={(v) => `¥${(v / 10000).toFixed(0)}万`}
                tick={{ fontSize: 12 }}
              />
              <Tooltip formatter={(value) => `¥${Number(value).toLocaleString()}`} />
              <Legend />
              <Line type="monotone" dataKey="予定" stroke="#93c5fd" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="実績" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 年次サマリー */}
      {yearSummaries.length > 0 && (
        <div className="bg-white rounded-xl shadow">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">年次サマリー</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="p-4 text-left">年</th>
                <th className="p-4 text-right">月数</th>
                <th className="p-4 text-right">年間合計</th>
                <th className="p-4 text-right">月平均</th>
              </tr>
            </thead>
            <tbody>
              {yearSummaries.map((y) => (
                <tr key={y.year} className="border-t hover:bg-gray-50">
                  <td className="p-4 font-semibold">{y.year}年</td>
                  <td className="p-4 text-right text-gray-500">{y.monthCount} ヶ月</td>
                  <td className="p-4 text-right font-semibold">¥{y.total.toLocaleString()}</td>
                  <td className="p-4 text-right text-gray-500">¥{y.average.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {months.length === 0 && (
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
          データがありません
        </div>
      )}
    </div>
  );
}
