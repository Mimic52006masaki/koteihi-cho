import { describe, expect, it } from "vitest";
import { coverageFromFilename, matchReceipts, parseMoneyForwardCsv, plannedAuPayAmount } from "../lib/receiptMatching";
import type { Statement } from "../lib/receiptMatching";

const row = (id: string, date: string, description: string, amount: number, account: string): Statement => ({
  id, date, description, amount, account, transfer: false,
});
const coverage = [{ from: "2026-10-17", to: "2026-11-19" }];

describe("家計簿CSVのレシート照合", () => {
  it("Shift-JISから復号したCSVの引用符付き項目を読む", () => {
    const text = '計算対象,日付,内容,金額（円）,保有金融機関,大項目,中項目,メモ,振替,ID\r\n' +
      '1,2026/10/20,"アークス,一関店",-1,なし,食費,食料品,,0,receipt-1\r\n';
    expect(parseMoneyForwardCsv(text)[0]).toMatchObject({
      id: "receipt-1", date: "2026-10-20", description: "アークス,一関店", amount: -1, account: "なし",
    });
    expect(coverageFromFilename("収入・支出詳細_2026-10-20_2026-11-19.csv"))
      .toEqual({ from: "2026-10-20", to: "2026-11-19" });
  });

  it("一意のSBIデビットとファミマカードを区別し、候補なしはauPayか現金にする", () => {
    const result = matchReceipts([
      row("r1", "2026-10-20", "アークス", -1176, "なし"),
      row("d1", "2026-10-22", "デビット 123456", -1176, "ドコモＳＭＴＢネット銀行"),
      row("r2", "2026-10-20", "薬王堂", -533, "なし"),
      row("f1", "2026-10-21", "薬王堂", -533, "ファミマカード"),
      row("r3", "2026-10-20", "イオン", -3360, "なし"),
    ], "2026-10-25", coverage);
    expect(result.map((item) => item.status)).toEqual(["id", "famima", "aupay_or_cash"]);
  });

  it("候補の競合、同じカード明細の奪い合い、金額違いを未確認にする", () => {
    const result = matchReceipts([
      row("r1", "2026-10-20", "アークス", -1000, "なし"),
      row("r2", "2026-10-20", "別の店", -1000, "なし"),
      row("d1", "2026-10-20", "デビット 111111", -1000, "ドコモＳＭＴＢネット銀行"),
      row("r3", "2026-10-20", "薬王堂", -2000, "なし"),
      row("f1", "2026-10-20", "薬王堂", -2100, "ファミマカード"),
    ], "2026-10-25", coverage);
    expect(result.map((item) => item.status)).toEqual(["unconfirmed", "unconfirmed", "unconfirmed"]);
  });

  it("前後3日のCSVがない、または3日が経っていないレシートは未確認にする", () => {
    const receipts = [row("r1", "2026-10-20", "アークス", -1176, "なし")];
    expect(matchReceipts(receipts, "2026-10-25", [{ from: "2026-10-20", to: "2026-11-19" }])[0].status)
      .toBe("unconfirmed");
    expect(matchReceipts(receipts, "2026-10-22", coverage)[0].status).toBe("unconfirmed");
  });

  it("期間途中の見込みは登録額を下回らせず、全件照合後だけ置き換える", () => {
    const matches = matchReceipts([row("r1", "2026-10-20", "アークス", -1176, "なし")], "2026-10-25", coverage);
    expect(plannedAuPayAmount(34965, matches, false)).toBe(34965);
    expect(plannedAuPayAmount(34965, matches, true)).toBe(1176);
  });
});
