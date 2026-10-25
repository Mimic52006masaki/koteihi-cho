import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useMonthly } from "../hooks/useMonthly";
import { apiGet, apiPost } from "../api/client";
import { coverageFromFilename, parseMoneyForwardCsv } from "../lib/receiptMatching";
import { weekSchedule, weekStartInTokyo, weeklyGroceryTotal } from "../lib/weeklyGrocery";
import type { WeeklyGroceryTotal } from "../lib/weeklyGrocery";

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
  last_month_cycle_date: string | null;
  has_last_month: boolean;
  remaining_budget: number;
  fixed_count: number;
  recent: { id: number; name: string; amount: number }[];
  account_summaries: AccountSummary[];
};

type GroceryBudget = {
  week_start: string;
  budget_amount: number;
  next_week_start: string;
  next_budget_amount: number;
  snapshot: null | {
    budget_amount: number;
    spent_amount: number;
    remaining_amount: number;
    unconfirmed_count: number;
    as_of_date: string;
  };
};

function Dashboard() {
  const queryClient = useQueryClient();
  const [groceryPreview, setGroceryPreview] = useState<WeeklyGroceryTotal | null>(null);
  const [groceryError, setGroceryError] = useState("");
  const [savingGrocery, setSavingGrocery] = useState(false);
  const [cycleDate, setCycleDate] = useState(today());
  const [closeDate, setCloseDate] = useState(today());

  const { data: stats } = useQuery<Stats>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await apiGet<Stats>("/dashboard/stats.php");
      return res.data;
    },
  });
  const { data: grocery } = useQuery<GroceryBudget>({
    queryKey: ["weekly-grocery"],
    queryFn: async () => (await apiGet<GroceryBudget>("/dashboard/weekly-grocery.php")).data,
  });

  const groceryBudget = grocery?.budget_amount ?? 10000;

  const readGroceryCsv = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      const weekStart = weekStartInTokyo();
      const asOf = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
      const decoded = await Promise.all(Array.from(files, async (file) => ({
        coverage: coverageFromFilename(file.name),
        rows: parseMoneyForwardCsv(new TextDecoder("shift_jis", { fatal: true }).decode(await file.arrayBuffer())),
      })));
      for (let date = weekStart; date <= asOf; date = new Date(Date.parse(`${date}T00:00:00Z`) + 86400000).toISOString().slice(0, 10)) {
        if (!decoded.some(({ coverage }) => coverage.from <= date && date <= coverage.to)) {
          throw new Error(`今週の${date}を含むCSVも選択してください`);
        }
      }
      setGroceryPreview(weeklyGroceryTotal(decoded.flatMap(({ rows }) => rows), weekStart));
      setGroceryError("");
    } catch (error) {
      setGroceryPreview(null);
      setGroceryError(error instanceof Error ? error.message : "CSVを読み込めませんでした");
    }
  };

  const saveGrocery = async () => {
    if (!groceryPreview || !grocery) return;
    setSavingGrocery(true);
    try {
      await apiPost("/dashboard/weekly-grocery.php", {
        week_start: grocery.week_start,
        as_of_date: new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" }),
        spent_amount: groceryPreview.spent,
        unconfirmed_count: groceryPreview.unconfirmed,
      });
      await queryClient.invalidateQueries({ queryKey: ["weekly-grocery"] });
      toast.success("今週の食材予算を保存しました");
      setGroceryPreview(null);
    } catch {
      toast.error("食材予算を保存できませんでした");
    } finally {
      setSavingGrocery(false);
    }
  };

  const { monthly: currentMonthly, generateMutation, closeMutation } = useMonthly();

  if (!stats) {
    return <div className="p-6">Loading...</div>;
  }

  // 今月の「予定額」と先月の「実績」を比べる。
  // 今月の実績と比べると、支払いが進むまで毎回大きなマイナスを指してしまうため。
  const diff = stats.total_fixed_costs - stats.last_month_total;
  const unpaidTotal = stats.total_fixed_costs - stats.monthly_total;
  const linkedRemaining = stats.account_summaries.reduce((sum, s) => sum + s.remaining, 0);
  const usageRate =
    stats.total_fixed_costs > 0
      ? Math.min(100, Math.round((stats.monthly_total / stats.total_fixed_costs) * 100))
      : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-3">
        <h2 className="font-semibold">🛒 今週の買い物</h2>
        {(() => {
          const schedule = weekSchedule(grocery?.week_start ?? weekStartInTokyo());
          const next = grocery?.next_budget_amount ?? groceryBudget;
          return <div className="text-sm text-gray-700">
            <p>期間 <strong>{schedule.range}</strong>・予算 ¥{groceryBudget.toLocaleString()}</p>
            <p className="text-xs text-gray-500">{schedule.lastDay} 23:59までの買い物をこの予算でやりくり（今日を含めあと{schedule.daysLeft}日）。{schedule.reset} 0:00に¥{next.toLocaleString()}へリセット{next !== groceryBudget && "（設定で変更済み）"}。</p>
          </div>;
        })()}
        {grocery?.snapshot ? (
          <>
            <div className="text-lg">使った額 <strong>¥{grocery.snapshot.spent_amount.toLocaleString()}</strong>
              {" / "}{grocery.snapshot.remaining_amount < 0 ? "超過" : "残り"} <strong className={grocery.snapshot.remaining_amount < 0 ? "text-red-600" : "text-green-700"}>
                ¥{Math.abs(grocery.snapshot.remaining_amount).toLocaleString()}
              </strong>
            </div>
            <p className="text-xs text-gray-500">{grocery.snapshot.as_of_date}時点の保存済み集計
              {grocery.snapshot.unconfirmed_count > 0 && `・未確認 ${grocery.snapshot.unconfirmed_count}件（合計に含めず）`}</p>
          </>
        ) : <p className="text-sm text-gray-600">今週の集計はまだ保存されていません。</p>}
        <p className="text-xs text-gray-500">店や食費・日用品の分類を問わず、買い物の手入力レシートを数えます。iDで払ったレシートも含み、SBIデビットの生明細は二重に数えません。判定できない明細は保留します。CSVで手動更新する場合は、今週の月曜から今日までを含む期間を選んでください。期間がまたがる場合は前期分も一緒に選びます。CSV自体は送信しません。</p>
        <input type="file" accept=".csv,text/csv" multiple aria-label="今週の家計簿CSVを選択" onChange={(event) => void readGroceryCsv(event.target.files)} className="block text-sm" />
        {groceryError && <p role="alert" className="text-red-600 text-sm">{groceryError}</p>}
        {groceryPreview && <div className="text-sm space-y-2">
          <p>今回の集計：¥{groceryPreview.spent.toLocaleString()}／残り ¥{(groceryBudget - groceryPreview.spent).toLocaleString()}（レシート {groceryPreview.receipts}件、レシートなしカード {groceryPreview.cardOnly}件、未確認 {groceryPreview.unconfirmed}件）</p>
          <button type="button" disabled={savingGrocery || !grocery} onClick={() => void saveGrocery()} className="bg-blue-600 text-white px-3 py-2 rounded disabled:opacity-50">この集計を保存</button>
        </div>}
      </section>

      {linkedRemaining < 0 && (
        <div className="bg-red-100 border border-red-300 text-red-700 p-4 rounded-lg">
          ⚠️ 固定費が口座残高を超えています
        </div>
      )}

      {/* 月次ステータスバー */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
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
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">固定費使用率</span>
          <span className="font-semibold">{usageRate}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
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
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">口座残高</div>
          <div className="text-3xl font-bold tracking-tight mt-1">¥{stats.total_balance.toLocaleString()}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">今月固定費</div>
          <div className="text-3xl font-bold tracking-tight mt-1">¥{stats.total_fixed_costs.toLocaleString()}</div>
          <div className="flex gap-3 mt-1 text-xs">
            <span className="text-blue-500">支払済 ¥{stats.monthly_total.toLocaleString()}</span>
            <span className="text-gray-400">未払 ¥{unpaidTotal.toLocaleString()}</span>
          </div>
        </div>

<div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">残り予算</div>
          <div
            className={`text-3xl font-bold tracking-tight mt-1 ${
              linkedRemaining < 0 ? "text-red-500" : "text-green-600"
            }`}
          >
            ¥{linkedRemaining.toLocaleString()}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">先月との差</div>
          {stats.has_last_month ? (
            <>
              <div
                className={`text-3xl font-bold tracking-tight mt-1 ${
                  diff > 0 ? "text-red-500" : diff < 0 ? "text-green-500" : "text-gray-500"
                }`}
              >
                {diff > 0 ? "+" : ""}¥{diff.toLocaleString()}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                今月の予定 ¥{stats.total_fixed_costs.toLocaleString()} − 先月の実績 ¥
                {stats.last_month_total.toLocaleString()}
                {stats.last_month_cycle_date ? `（${stats.last_month_cycle_date} 開始）` : ""}
              </div>
            </>
          ) : (
            <>
              <div className="text-3xl font-bold tracking-tight mt-1 text-gray-300">—</div>
              <div className="text-xs text-gray-400 mt-1">締め済みの月がまだありません</div>
            </>
          )}
        </div>
      </div>

      {/* 口座別 固定費残り予算 */}
      {stats.account_summaries.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="p-5 border-b font-semibold text-sm">口座別 固定費残り予算</div>
          <div className="divide-y">
            {stats.account_summaries.map((s) => (
              <div key={s.account_id} className="p-5 flex justify-between items-center">
                <div>
                  <div className="font-medium">{s.account_name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    残高 ¥{s.balance.toLocaleString()}{"　"}未払い固定費 ¥{s.planned_total.toLocaleString()}
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

{/* 最近の支払い */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
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
