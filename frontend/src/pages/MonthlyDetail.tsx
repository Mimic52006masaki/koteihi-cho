import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchHistoryDetail } from "../api/monthly";
import type { MonthlyHistoryDetail } from "../api/monthly";

export default function MonthlyDetail() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery<MonthlyHistoryDetail>({
    queryKey: ["history-detail", id],
    queryFn: () => fetchHistoryDetail(id!),
    enabled: !!id,
  });

  const items = data?.items ?? [];
  // 入金（給料など）は一覧には出すが、支出の合計には入れない
  const expenses = items.filter((i) => i.type !== "deposit");
  const totalPlanned = expenses.reduce((sum, i) => sum + Number(i.amount), 0);
  const totalActual = expenses.reduce((sum, i) => sum + Number(i.actual_amount ?? 0), 0);
  const diff = totalActual - totalPlanned;

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{data?.cycle?.cycle_date ?? id} 固定費</h1>

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
            {items.map((item) => {
              const actual = Number(item.actual_amount ?? 0);
              const isZeroDiff = actual === Number(item.amount);
              const isDeposit = item.type === "deposit";
              return (
                <tr key={item.id} className={`border-t ${isZeroDiff ? "text-gray-400" : ""}`}>
                  <td className="p-4">
                    {item.name}
                    {isDeposit && (
                      <span className="ml-2 text-xs text-blue-600 bg-blue-50 rounded px-1.5 py-0.5">
                        入金・合計外
                      </span>
                    )}
                  </td>
                  <td className="p-4">¥{Number(item.amount).toLocaleString()}</td>
                  <td className="p-4">¥{actual.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="p-6 border-t space-y-2 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>予定合計</span>
            <span>¥{totalPlanned.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>実績合計</span>
            <span>¥{totalActual.toLocaleString()}</span>
          </div>
          <div
            className={`flex justify-between font-bold border-t pt-2 ${
              diff > 0 ? "text-red-500" : diff < 0 ? "text-green-600" : "text-gray-400"
            }`}
          >
            <span>差額</span>
            <span>{diff >= 0 ? "+" : ""}¥{diff.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
