import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import AmountInput from "../components/AmountInput";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import type { Account } from "../types";
import { fetchAccounts } from "../api/accounts";
import { fetchSettings, updateSettings } from "../api/settings";
import type { SettingsData } from "../api/settings";
import { useMonthly } from "../hooks/useMonthly";
import { apiGet } from "../api/client";

type Stats = {
  salary: number;
  total_balance: number;
  safety_margin: number;
  monthly_total: number;
  last_month_total: number;
  remaining_budget: number;
  fixed_count: number;
  recent: { id: number; name: string; amount: number }[];
};

function Dashboard() {
  const queryClient = useQueryClient();
  const [salary, setSalary] = useState<number>(0);
  const [salaryAccountId, setSalaryAccountId] = useState<number | null>(null);
  const [salaryReceived, setSalaryReceived] = useState<boolean>(false);
  const [safetyMargin, setSafetyMargin] = useState<number>(0);
  const [showSalaryForm, setShowSalaryForm] = useState(false);

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

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ["accounts"],
    queryFn: fetchAccounts,
  });

  const { monthly: currentMonthly, generateMutation, closeMutation, updateCycleMutation } = useMonthly();

  useEffect(() => {
    if (currentMonthly) {
      setSalary(currentMonthly.salary ?? 0);
      setSalaryAccountId(currentMonthly.salary_account_id ?? null);
      setSalaryReceived(currentMonthly.salary_received ?? false);
    } else {
      setShowSalaryForm(false);
    }
  }, [currentMonthly]);

  const handleSaveSalary = useCallback(() => {
    const cycleId = currentMonthly?.cycle_id;
    if (!cycleId) { toast.error("月次が存在しません"); return; }
    updateCycleMutation.mutate(
      { cycle_id: cycleId, salary, salary_account_id: salaryAccountId },
      {
        onSuccess: () => {
          toast.success("給与を保存しました");
          setShowSalaryForm(false);
        },
        onError: () => toast.error("給与保存失敗"),
      }
    );
  }, [currentMonthly?.cycle_id, salary, salaryAccountId, updateCycleMutation]);

  if (!stats) {
    return <div className="p-6">Loading...</div>;
  }

  const diff = stats.monthly_total - stats.last_month_total;
  const usableMoney = stats.total_balance - stats.safety_margin;
  const usageRate =
    usableMoney > 0
      ? Math.min(100, Math.round((stats.monthly_total / usableMoney) * 100))
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-3">
          {currentMonthly && (
            <Link
              to="/payday"
              className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-600 transition"
            >
              給料日フロー
            </Link>
          )}
        </div>
      </div>

      {stats.remaining_budget < 0 && (
        <div className="bg-red-100 border border-red-300 text-red-700 p-4 rounded-lg">
          ⚠️ 固定費が口座残高を超えています
        </div>
      )}

      {/* 月次ステータスバー */}
      <div className="bg-white rounded-xl shadow p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {currentMonthly ? (
            <>
              <span className="text-sm text-gray-500">進行中の月次</span>
              <span className="font-semibold">
                {currentMonthly.cycle_date ?? ""}
              </span>
              {salaryReceived ? (
                <span className="bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                  給与受取済み
                </span>
              ) : (
                <span className="bg-yellow-100 text-yellow-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                  給与未受取
                </span>
              )}
            </>
          ) : (
            <span className="text-sm text-gray-400">月次が存在しません</span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() =>
              generateMutation.mutate(undefined, {
                onSuccess: () => toast.success("月次を生成しました"),
                onError: () => toast.error("月次生成に失敗しました"),
              })
            }
            disabled={generateMutation.isPending}
            className="bg-blue-500 text-white px-3 py-1.5 rounded text-sm disabled:opacity-50"
          >
            月次開始
          </button>
          <button
            onClick={() =>
              closeMutation.mutate(undefined, {
                onSuccess: () => toast.success("月次を締めました"),
                onError: () => toast.error("締め失敗"),
              })
            }
            disabled={closeMutation.isPending}
            className="bg-green-500 text-white px-3 py-1.5 rounded text-sm disabled:opacity-50"
          >
            月次締め
          </button>
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
      </div>

      {/* メトリクスカード */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl shadow">
          <div className="text-sm text-gray-500">給与</div>
          <div className="text-2xl font-bold">¥{salary.toLocaleString()}</div>
          {currentMonthly && (
            <button
              onClick={() => setShowSalaryForm((v) => !v)}
              className="text-xs text-blue-500 mt-1 hover:underline"
            >
              {showSalaryForm ? "閉じる" : "変更"}
            </button>
          )}
        </div>

        <div className="bg-white p-5 rounded-xl shadow">
          <div className="text-sm text-gray-500">口座残高</div>
          <div className="text-2xl font-bold">¥{stats.total_balance.toLocaleString()}</div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow">
          <div className="text-sm text-gray-500">今月固定費</div>
          <div className="text-2xl font-bold">¥{stats.monthly_total.toLocaleString()}</div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow">
          <div className="text-sm text-gray-500">安全余剰</div>
          <div className="text-2xl font-bold">¥{stats.safety_margin.toLocaleString()}</div>
          <button
            onClick={() => saveSettingsMutation.mutate(safetyMargin)}
            className="hidden"
          />
        </div>

        <div className="bg-white p-5 rounded-xl shadow">
          <div className="text-sm text-gray-500">残り予算</div>
          <div
            className={`text-2xl font-bold ${
              stats.remaining_budget < 0 ? "text-red-500" : "text-green-600"
            }`}
          >
            ¥{stats.remaining_budget.toLocaleString()}
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

      {/* 給与設定フォーム（インライン展開） */}
      {showSalaryForm && (
        <div className="bg-white p-5 rounded-xl shadow border border-blue-100 space-y-3">
          <div className="font-semibold text-sm">給与設定</div>
          <AmountInput value={salary} onChange={setSalary} placeholder="給与額" />
          <select
            value={salaryAccountId ?? ""}
            onChange={(e) => setSalaryAccountId(e.target.value ? Number(e.target.value) : null)}
            className="border p-2 rounded w-full text-sm"
          >
            <option value="">振込口座選択</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              onClick={handleSaveSalary}
              disabled={updateCycleMutation.isPending}
              className="bg-blue-500 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
            >
              保存
            </button>
            <button
              onClick={() => setShowSalaryForm(false)}
              className="border border-gray-300 px-4 py-2 rounded text-sm"
            >
              キャンセル
            </button>
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
