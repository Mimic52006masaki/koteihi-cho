import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAccounts } from "../api/accounts";
import { fetchFixedCosts } from "../api/fixedCosts";
import { fetchCurrentMonthly } from "../api/monthly";
import AmountInput from "../components/AmountInput";
import { buildForecastLines, calculatePaydayForecast } from "../lib/paydayForecast";
import type { ForecastLine, FundingSource } from "../lib/paydayForecast";
import { coverageFromFilename, matchReceipts, parseMoneyForwardCsv, plannedAuPayAmount } from "../lib/receiptMatching";
import type { ReceiptMatch } from "../lib/receiptMatching";

const yen = (amount: number) => `¥${amount.toLocaleString()}`;
const statusLabels = { id: "iD", famima: "ファミマT", aupay_or_cash: "auPayか現金", unconfirmed: "未確認" };

export default function PaydayForecast() {
  const { data: accounts, isLoading: accountsLoading } = useQuery({ queryKey: ["accounts"], queryFn: fetchAccounts });
  const { data: costs, isLoading: costsLoading } = useQuery({ queryKey: ["fixed-costs"], queryFn: fetchFixedCosts });
  const { data: monthly } = useQuery({ queryKey: ["current-monthly"], queryFn: fetchCurrentMonthly });
  const [salaryOverride, setSalaryOverride] = useState<number | null>(null);
  const [rokinBuffer, setRokinBuffer] = useState(20000);
  const [rokinMinimum, setRokinMinimum] = useState(320000);
  const [edits, setEdits] = useState<Record<string, Partial<ForecastLine>>>({});
  const [receiptMatches, setReceiptMatches] = useState<ReceiptMatch[] | null>(null);
  const [receiptError, setReceiptError] = useState("");
  const [receiptPeriod, setReceiptPeriod] = useState("");
  const [receiptFinal, setReceiptFinal] = useState(false);

  const salaryMaster = costs?.find((cost) => cost.is_active && cost.type === "deposit" && cost.name === "給与");
  const salaryPayment = monthly?.items.find((item) => item.type === "deposit" && item.name === "給与" && item.paid_amount !== null);
  const salary = salaryOverride ?? (salaryPayment ? Number(salaryPayment.paid_amount) : salaryMaster?.default_amount ?? 0);

  const rokin = accounts?.find((account) => account.name === "東北労働金庫");
  const sbi = accounts?.find((account) => account.name.includes("ＳＭＴＢ") && !account.name.includes("ハイブリッド"));
  const baseLines = useMemo(() => rokin && sbi && costs
    ? buildForecastLines(costs, rokin.id, sbi.id) : [], [costs, rokin, sbi]);
  const auPayOrCash = receiptMatches?.filter((match) => match.status === "aupay_or_cash") ?? [];
  const receiptEstimate = auPayOrCash.reduce((sum, match) => sum - match.receipt.amount, 0);
  const applyReceiptEstimate = receiptFinal || auPayOrCash.length > 0;
  const lines = baseLines.map((line) => ({
    ...line,
    ...(applyReceiptEstimate && line.name.startsWith("auPay")
      ? {
        amount: plannedAuPayAmount(line.amount, receiptMatches ?? [], receiptFinal),
        note: receiptFinal
          ? "全期間を照合したauPayか現金の合計。現金を含む可能性あり"
          : "暫定見込み。未確認や未到来の日があるため、登録予定額と照合済み額の大きい方",
      } : {}),
    ...edits[line.id],
  }));
  const forecast = calculatePaydayForecast(lines, salary, rokinBuffer, rokinMinimum);
  const setLine = (id: string, patch: Partial<ForecastLine>) =>
    setEdits((current) => ({ ...current, [id]: { ...current[id], ...patch } }));

  const readReceipts = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      const decoded = await Promise.all(Array.from(files, async (file) => ({
        coverage: coverageFromFilename(file.name),
        rows: parseMoneyForwardCsv(new TextDecoder("shift_jis", { fatal: true }).decode(await file.arrayBuffer())),
      })));
      const rows = decoded.flatMap((file) => file.rows);
      const coverage = decoded.map((file) => file.coverage);
      const target = [...coverage].sort((a, b) => b.from.localeCompare(a.from))[0];
      const asOf = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
      const matches = matchReceipts(rows, asOf, coverage).filter((match) =>
        match.receipt.date >= target.from && match.receipt.date <= target.to);
      setReceiptMatches(matches);
      setReceiptFinal(Date.parse(`${target.to}T00:00:00Z`) + 3 * 86400000 < Date.parse(`${asOf}T00:00:00Z`)
        && matches.every((match) => match.status !== "unconfirmed"));
      setReceiptPeriod(`${target.from}〜${target.to}`);
      setReceiptError("");
    } catch (error) {
      setReceiptMatches(null);
      setReceiptFinal(false);
      setReceiptError(error instanceof Error ? error.message : "CSVを読み込めませんでした");
    }
  };

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
        <p className="text-xs text-gray-500">給料は今月明細の給与実行額（なければ固定費マスタの予定額）を初期値にします。予備額2万円は過去の残額2〜4万円、下限32万円は現在の運用に基づく初期値です。必要に応じて変更してください。</p>
      </section>

      <section className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
        <h2 className="font-semibold">来月のauPay見込み</h2>
        <p className="text-sm text-gray-600">マネーフォワードの「収入・支出詳細」CSVを選択してください。照合の前後3日を含むよう、必要なら前の期間のCSVも一緒に選びます。ファイルはこの画面内で読み、サーバーへ送信・保存しません。</p>
        <p className="text-xs text-gray-500">手入力と同額のSBI「デビット 数字列」が前後3日で一意ならiD、ファミマカード明細が前後1日で一意ならファミマT。両方なければ「auPayか現金」。候補の競合や照合期間の不足は「未確認」にします。</p>
        <input type="file" accept=".csv,text/csv" multiple aria-label="家計簿CSVを選択" onChange={(event) => void readReceipts(event.target.files)} className="block text-sm" />
        {receiptError && <p role="alert" className="text-red-600 text-sm">{receiptError}</p>}
        {receiptMatches && <div className="space-y-2 text-sm">
          <p>読込期間：{receiptPeriod}／auPayか現金 {yen(receiptEstimate)}（{auPayOrCash.length}件）／未確認 {receiptMatches.filter((match) => match.status === "unconfirmed").length}件</p>
          <p className="text-xs text-amber-800">「auPayか現金」はカード明細と一致しなかった手入力の合計で、カード請求額ではありません。未確認は合計から除外します。期間終了後に全件を照合できた場合だけ登録予定額を置き換え、それまでは登録予定額と照合済み額の大きい方で試算します。</p>
          <div className="max-h-64 overflow-auto border rounded divide-y">
            {receiptMatches.map((match) => <div key={match.receipt.id} className="p-2 grid grid-cols-1 sm:grid-cols-[100px_1fr_100px_120px] gap-2 text-xs">
              <span>{match.receipt.date}</span><span>{match.receipt.description}<span className="block text-gray-500">{match.reason}</span></span><span>{yen(-match.receipt.amount)}</span><span>{statusLabels[match.status]}</span>
            </div>)}
          </div>
        </div>}
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
      <p className="text-xs text-gray-500">CSV未読込時は固定費マスタのauPay予定額を使います。iDや追加のPayPay利用、現在の口座残高は含みません。</p>
    </div>
  );
}
