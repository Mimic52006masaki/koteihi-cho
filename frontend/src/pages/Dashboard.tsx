import { useState, useEffect } from "react";
import AmountInput from "../components/AmountInput";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { fetchSettings, updateSettings } from "../api/settings";
import type { SettingsData } from "../api/settings";
import { useMonthly } from "../hooks/useMonthly";
import { apiGet } from "../api/client";

const today = () => new Date().toISOString().slice(0, 10);

type AccountSummary = {
  account_id: number;
  account_name: string;
  balance: number;
  planned_total: number;
  remaining: number;
};

type Stats = {
  salary: number;
  total_balance: number;
  safety_margin: number;
  monthly_total: number;
  total_fixed_costs: number;
  last_month_total: number;
  remaining_budget: number;
  fixed_count: number;
  recent: { id: number; name: string; amount: number }[];
  account_summaries: AccountSummary[];
};

function Dashboard() {
  const queryClient = useQueryClient();
  const [safetyMargin, setSafetyMargin] = useState<number>(0);
  const [cycleDate, setCycleDate] = useState(today());
  const [closeDate, setCloseDate] = useState(today());

  const { data: settings } = useQuery<SettingsData>({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });

  useEffect(() => {
    if (settings) setSafetyMargin(Number(settings.safety_margin ?? 0));
  }, [settings]);

  const saveSettingsMutation = useMutation({
    mutationFn: (margin: number) => updateSettings({ safety_margin: margin }),
    onSuccess: () => {
      toast.success("安全余剰を保存しました");
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: () => toast.error("保存に失敗しました"),
  });

  const { data: stats } = useQuery<Stats>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await apiGet<Stats>("/dashboard/stats.php");
      return res.data;
    },
  });

  const { monthly: currentMonthly, generateMutation, closeMutation } = useMonthly();

  if (!stats) {
    return <div className="p-6">Loading...</div>;
  }

  const diff = stats.monthly_total - stats.last_month_total;
  const unpaidTotal = stats.total_fixed_costs - stats.monthly_total;
  const linkedRemaining = stats.account_summaries.reduce((sum, s) => sum + s.remaining, 0);
  const usageRate =
    stats.total_fixed_costs > 0
      ? Math.min(100, Math.round((stats.monthly_total / stats.total_fixed_costs) * 100))
      : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {linkedRemaining < 0 && (
        <div className="bg-red-100 border border-red-300 text-red-700 p-4 rounded-lg">
          ⚠️ 固定費が口座残高を超えています
        </div>
      )}

      {/* 月次ステータスバー */}
      <div className="bg-white rounded-xl shadow p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          {currentMonthly ? (
            <>
              <span className="text-sm text-gray-500">進行中の月次</span>
              <span className="font-semibold">{currentMonthly.cycle_date}</span>
            </>
          ) : (
            <span className="text-sm text-gray-400">月次が存在しません</span>
          )}
        </div>

        <div className="flex flex-wrap gap-4 items-end">
          {/* 月次開始 */}
          {!currentMonthly && (
            <div className="flex items-end gap-2">
              <div>
                <label className="text-xs text-gray-500">開始日</label>
                <input
                  type="date"
                  value={cycleDate}
                  onChange={(e) => setCycleDate(e.target.value)}
                  className="block border px-2 py-1.5 rounded text-sm mt-0.5"
                />
              </div>
              <button
                onClick={() =>
                  generateMutation.mutate(cycleDate, {
                    onSuccess: () => toast.success("月次を開始しました"),
                    onError: () => toast.error("月次開始に失敗しました"),
                  })
                }
                disabled={generateMutation.isPending}
                className="bg-blue-500 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
              >
                月次開始
              </button>
            </div>
          )}

          {/* 月次締め */}
          {currentMonthly && (
            <div className="flex items-end gap-2 ml-auto">
              <div>
                <label className="text-xs text-gray-500">締め日</label>
                <input
                  type="date"
                  value={closeDate}
                  onChange={(e) => setCloseDate(e.target.value)}
                  className="block border px-2 py-1.5 rounded text-sm mt-0.5"
                />
              </div>
              <button
                onClick={() =>
                  closeMutation.mutate(closeDate, {
                    onSuccess: () => toast.success("月次を締めました"),
                    onError: () => toast.error("月次締めに失敗しました"),
                  })
                }
                disabled={closeMutation.isPending}
                className="bg-gray-700 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
              >
                月次締め
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 固定費使用率 */}
      <div className="bg-white p-5 rounded-xl shadow space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">固定費使用率</span>
          <span className="font-semibold">{usageRate}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-blue-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${usageRate}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>実行済み ¥{stats.monthly_total.toLocaleString()}</span>
          <span>合計 ¥{stats.total_fixed_costs.toLocaleString()}</span>
        </div>
      </div>

      {/* メトリクスカード */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl shadow">
          <div className="text-sm text-gray-500">口座残高</div>
          <div className="text-2xl font-bold">¥{stats.total_balance.toLocaleString()}</div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow">
          <div className="text-sm text-gray-500">今月固定費</div>
          <div className="text-2xl font-bold">¥{stats.total_fixed_costs.toLocaleString()}</div>
          <div className="flex gap-3 mt-1 text-xs">
            <span className="text-blue-500">支払済 ¥{stats.monthly_total.toLocaleString()}</span>
            <span className="text-gray-400">未払 ¥{unpaidTotal.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow">
          <div className="text-sm text-gray-500">安全余剰</div>
          <div className="text-2xl font-bold">¥{stats.safety_margin.toLocaleString()}</div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow">
          <div className="text-sm text-gray-500">残り予算</div>
          <div
            className={`text-2xl font-bold ${
              linkedRemaining < 0 ? "text-red-500" : "text-green-600"
            }`}
          >
            ¥{linkedRemaining.toLocaleString()}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow">
          <div className="text-sm text-gray-500">先月との差</div>
          <div
            className={`text-2xl font-bold ${
              diff > 0 ? "text-red-500" : "text-green-500"
            }`}
          >
            {diff >= 0 ? "+" : ""}¥{diff.toLocaleString()}
          </div>
        </div>
      </div>

      {/* 口座別 固定費残り予算 */}
      {stats.account_summaries.length > 0 && (
        <div className="bg-white rounded-xl shadow">
          <div className="p-5 border-b font-semibold text-sm">口座別 固定費残り予算</div>
          <div className="divide-y">
            {stats.account_summaries.map((s) => (
              <div key={s.account_id} className="p-5 flex justify-between items-center">
                <div>
                  <div className="font-medium">{s.account_name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    残高 ¥{s.balance.toLocaleString()}　未払い固定費 ¥{s.planned_total.toLocaleString()}
                  </div>
                </div>
                <div className={`text-lg font-bold ${s.remaining < 0 ? "text-red-500" : "text-green-600"}`}>
                  ¥{s.remaining.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 安全余剰設定 */}
      <div className="bg-white p-5 rounded-xl shadow space-y-3">
        <div className="font-semibold text-sm">安全余剰設定</div>
        <div className="flex items-center gap-3">
          <AmountInput
            value={safetyMargin}
            onChange={setSafetyMargin}
            placeholder="安全余剰額"
          />
          <button
            onClick={() => saveSettingsMutation.mutate(safetyMargin)}
            disabled={saveSettingsMutation.isPending}
            className="bg-gray-500 text-white px-4 py-2 rounded text-sm disabled:opacity-50 whitespace-nowrap"
          >
            保存
          </button>
        </div>
      </div>

      {/* 最近の支払い */}
      <div className="bg-white rounded-xl shadow">
        <div className="p-5 border-b font-semibold">最近の支払い</div>
        <div className="divide-y">
          {stats.recent.length === 0 && (
            <div className="p-4 text-gray-500 text-sm">支払いデータがありません</div>
          )}
          {stats.recent.map((item) => (
            <div key={item.id} className="flex justify-between p-4">
              <div className="text-sm">{item.name}</div>
              <div className="text-sm font-semibold">¥{Number(item.amount ?? 0).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
