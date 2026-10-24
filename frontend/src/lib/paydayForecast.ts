import type { FixedCost } from "../types";

export type FundingSource = "rokin" | "sbi" | "other" | "unassigned";

export type ForecastLine = {
  id: string;
  name: string;
  amount: number;
  source: FundingSource;
  note?: string;
};

export function buildForecastLines(
  costs: FixedCost[],
  rokinId: number,
  sbiId: number,
): ForecastLine[] {
  const lines = costs.filter((cost) => cost.is_active && cost.type !== "deposit").map((cost) => {
    let source: FundingSource = cost.default_account_id === rokinId
      ? "rokin"
      : cost.default_account_id === sbiId
        ? "sbi"
        : cost.default_account_id === null ? "unassigned" : "other";
    let note: string | undefined;

    // 2026-10-25確認の口座振替実績。旧データの登録口座が異なる場合だけ試算上で補正する。
    if (cost.type === "payment" && source !== "sbi" &&
      (cost.name === "KDDI" || cost.name.startsWith("ダンス教室"))) {
      source = "sbi";
      note = "4期分の家計簿CSVでSBI引落を確認。登録口座との差を試算上で補正";
    }

    return {
      id: String(cost.id),
      name: cost.name,
      amount: cost.default_amount,
      source,
      note,
    };
  });

  // 代表口座からハイブリッド預金への移動は口座間振替だが、代表口座の必要額に含める。
  lines.push({
    id: "hybrid-transfer",
    name: "SBIハイブリッド預金へ振替",
    amount: 20000,
    source: "sbi",
    note: "毎月26日。うちNISA積立10,000円。固定費マスタには未登録",
  });
  return lines;
}

export function calculatePaydayForecast(
  lines: ForecastLine[],
  salary: number,
  rokinBuffer: number,
  rokinMinimum: number,
) {
  const rokinOutflows = lines.filter((line) => line.source === "rokin")
    .reduce((sum, line) => sum + line.amount, 0);
  const sbiOutflows = lines.filter((line) => line.source === "sbi")
    .reduce((sum, line) => sum + line.amount, 0);
  const unassigned = lines.filter((line) => line.source === "unassigned");
  const calculatedRokin = rokinOutflows + rokinBuffer;
  const rokinRequired = Math.max(calculatedRokin, rokinMinimum);
  const sbiAvailable = Math.max(0, salary - rokinRequired);
  return {
    rokinOutflows,
    sbiOutflows,
    calculatedRokin,
    rokinRequired,
    rokinShortage: Math.max(0, rokinRequired - salary),
    sbiAvailable,
    sbiShortage: Math.max(0, sbiOutflows - sbiAvailable),
    unassigned,
  };
}
