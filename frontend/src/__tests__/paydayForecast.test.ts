import { describe, expect, it } from "vitest";
import { buildForecastLines, calculatePaydayForecast } from "../lib/paydayForecast";
import type { FixedCost } from "../types";

const cost = (id: number, name: string, type: FixedCost["type"], amount: number, account: number): FixedCost => ({
  id, name, type, default_amount: amount, default_account_id: account,
  to_account_id: null, is_active: true,
});

describe("給料日の振り分け試算", () => {
  const lines = buildForecastLines([
    cost(1, "給与", "deposit", 390000, 1),
    cost(2, "北銀へ予算分配", "transfer", 20000, 1),
    cost(3, "ファミマTカード", "payment", 40000, 1),
    cost(4, "生協COOP", "payment", 9000, 2),
    cost(5, "レイク", "payment", 14000, 3),
    cost(6, "KDDI", "payment", 14430, 1),
    cost(7, "ダンス教室(Core)", "payment", 5700, 1),
  ], 1, 3);

  it("北銀への振替を労金に含め、北銀の支払いと給与は二重に数えない", () => {
    const result = calculatePaydayForecast(lines, 362741, 20000, 320000);
    expect(result.rokinOutflows).toBe(60000);
    expect(result.rokinRequired).toBe(320000);
    expect(result.sbiOutflows).toBe(54130);
    expect(result.sbiAvailable).toBe(42741);
    expect(result.sbiShortage).toBe(11389);
  });

  it("引落実績が確認されたKDDIとダンスをDB登録の労金からSBIへ試算上だけ移す", () => {
    expect(lines.find((line) => line.name === "KDDI")?.source).toBe("sbi");
    expect(lines.find((line) => line.name.startsWith("ダンス"))?.source).toBe("sbi");
    expect(lines.find((line) => line.id === "hybrid-transfer")?.amount).toBe(20000);
  });

  it("労金の必要額が給与を超える場合は労金とSBIの不足を別々に示す", () => {
    const result = calculatePaydayForecast(lines, 300000, 20000, 320000);
    expect(result.rokinShortage).toBe(20000);
    expect(result.sbiAvailable).toBe(0);
    expect(result.sbiShortage).toBe(54130);
  });
});
