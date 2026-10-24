import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAccounts } from "../api/accounts";
import { fetchFixedCosts } from "../api/fixedCosts";
import { apiGet } from "../api/client";
import AmountInput from "../components/AmountInput";
import { buildForecastLines, calculatePaydayForecast } from "../lib/paydayForecast";
import type { ForecastLine, FundingSource } from "../lib/paydayForecast";

type PaydayStatus = { salary: number; cycle_date: string; salary_received: boolean };
const yen = (amount: number) => `¥${amount.toLocaleString()}`;

export default function PaydayForecast() {
  const { data: accounts, isLoading: accountsLoading } = useQuery({ queryKey: ["accounts"], queryFn: fetchAccounts });
  const { data: costs, isLoading: costsLoading } = useQuery({ queryKey: ["fixed-costs"], queryFn: fetchFixedCosts });
  const { data: payday } = useQuery({
    queryKey: ["payday-status"],
    queryFn: async () => {
      const response = await apiGet<PaydayStatus>("/monthly/payday-status.php");
      return response.success ? response.data : null;
    },
  });
  const [salaryOverride, setSalaryOverride] = useState<number | null>(null);
  const [rokinBuffer, setRokinBuffer] = useState(20000);
  const [rokinMinimum, setRokinMinimum] = useState(320000);
  const [edits, setEdits] = useState<Record<string, Partial<ForecastLine>>>({});

  const salaryMaster = costs?.find((cost) => cost.is_active && cost.type === "deposit" && cost.name === "給与");
  const salary = salaryOverride ?? (payday?.salary && payday.salary > 0 ? payday.salary : salaryMaster?.default_amount ?? 0);

  const rokin = accounts?.find((account) => account.name === "東北労働金庫");
  const sbi = accounts?.find((account) => account.name.includes("ＳＭＴＢ") && !account.name.includes("ハイブリッド"));
  const baseLines = useMemo(() => rokin && sbi && costs
    ? buildForecastLines(costs, rokin.id, sbi.id) : [], [costs, rokin, sbi]);
  const lines = baseLines.map((line) => ({ ...line, ...edits[line.id] }));
  const forecast = calculatePaydayForecast(lines, salary, rokinBuffer, rokinMinimum);
  const setLine = (id: string, patch: Partial<ForecastLine>) =>
    setEdits((current) => ({ ...current, [id]: { ...current[id], ...patch } }));

  if (accountsLoading || costsLoading) return <div className="p-6">試算データを読み込み中...</div>;
  if (!rokin || !sbi || !costs) return <div className="p-6">労金・SBI代表口座・固定費の情報を確認できません。</div>;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">給料日の振り分け試算</h1>
        <p className="text-sm text-gray-600 mt-1">画面上の試算です。振替・固定費登録・口座残高は変更しません。</p>
      </div>

      <section className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <h2 className="font-semibold">試算の条件</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="text-sm space-y-1">給料の額
            <AmountInput value={salary} onChange={(value) => setSalaryOverride(Math.max(0, value))} className="block w-full border rounded p-2" />
          </label>
          <label className="text-sm space-y-1">労金に残す予備額
            <AmountInput value={rokinBuffer} onChange={(value) => setRokinBuffer(Math.max(0, value))} className="block w-full border rounded p-2" />
          </label>
          <label className="text-sm space-y-1">労金に残す運用上の下限
            <AmountInput value={rokinMinimum} onChange={(value) => setRokinMinimum(Math.max(0, value))} className="block w-full border rounded p-2" />
          </label>
        </div>
        <p className="text-xs text-gray-500">給料は進行中の月次の記録（なければ固定費マスタの予定額）を初期値にします。予備額2万円は過去の残額2〜4万円、下限32万円は現在の運用に基づく初期値です。必要に応じて変更してください。</p>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4" aria-label="試算結果">
        <div className="bg-white p-5 rounded-2xl border"><div className="text-sm text-gray-500">労金に残す必要額</div><div className="text-2xl font-bold">{yen(forecast.rokinRequired)}</div><div className="text-xs text-gray-500">支出 {yen(forecast.rokinOutflows)} ＋ 予備 {yen(rokinBuffer)}／下限 {yen(rokinMinimum)}</div></div>
        <div className="bg-white p-5 rounded-2xl border"><div className="text-sm text-gray-500">給料からSBIへ回せる額</div><div className="text-2xl font-bold">{yen(forecast.sbiAvailable)}</div><div className="text-xs text-gray-500">給料 {yen(salary)} − 労金に残す必要額</div></div>
        <div className="bg-white p-5 rounded-2xl border"><div className="text-sm text-gray-500">SBIの決まった支出に対する不足額</div><div className={`text-2xl font-bold ${forecast.sbiShortage > 0 ? "text-red-600" : "text-green-700"}`}>{yen(forecast.sbiShortage)}</div><div className="text-xs text-gray-500">SBI側の予定 {yen(forecast.sbiOutflows)}</div></div>
      </section>

      {forecast.rokinShortage > 0 && <p className="bg-red-50 text-red-700 p-3 rounded" role="alert">給料だけでは労金に残す必要額に {yen(forecast.rokinShortage)} 足りません。</p>}
      {forecast.sbiShortage > 0 && <p className="bg-amber-50 text-amber-800 p-3 rounded" role="alert">SBIへ回せる額が決まった支出に {yen(forecast.sbiShortage)} 足りません。</p>}
      {forecast.unassigned.length > 0 && <p className="bg-amber-50 text-amber-800 p-3 rounded" role="alert">支払口座が未設定の項目が {forecast.unassigned.length} 件あります。下の一覧で振り分け先を選んでください。</p>}

      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-5 border-b"><h2 className="font-semibold">計算に使う予定額と支払元</h2><p className="text-xs text-gray-500 mt-1">固定費マスタの予定額を使用。ここでの変更は保存されません。北銀の支払いは労金から北銀への予算分配に含め、二重には足しません。</p></div>
        <div className="divide-y">
          {lines.map((line) => <div key={line.id} className="p-4 grid grid-cols-1 sm:grid-cols-[1fr_150px_190px] gap-3 items-center">
            <div><div className="font-medium text-sm">{line.name}</div>{line.note && <div className="text-xs text-amber-700">{line.note}</div>}</div>
            <AmountInput value={line.amount} onChange={(amount) => setLine(line.id, { amount: Math.max(0, amount) })} className="border rounded p-2 w-full" />
            <select aria-label={`${line.name}の支払元`} value={line.source} onChange={(event) => setLine(line.id, { source: event.target.value as FundingSource })} className="border rounded p-2 text-sm">
              <option value="rokin">東北労働金庫から</option><option value="sbi">SBI代表口座から</option><option value="other">別口座（計算対象外）</option><option value="unassigned">未確認</option>
            </select>
          </div>)}
        </div>
      </section>
      <p className="text-xs text-gray-500">auPayの来月利用分、iDや追加のPayPay利用、現在の口座残高は含みません。auPayはレシートの保存先と重複除外を確認してから追加します。</p>
    </div>
  );
}
