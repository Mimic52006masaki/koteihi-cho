import { describe, expect, it } from "vitest";
import { weeklyGroceryTotal, weekStartInTokyo } from "../lib/weeklyGrocery";
import type { Statement } from "../lib/receiptMatching";

const row = (id: string, date: string, description: string, amount: number, account: string): Statement =>
  ({ id, date, description, amount, account, transfer: false });

describe("weekly grocery budget", () => {
  it("uses Monday in Tokyo", () => {
    expect(weekStartInTokyo(new Date("2026-10-25T12:00:00Z"))).toBe("2026-10-19");
  });

  it("counts receipts once, card-only purchases, and holds mismatches", () => {
    const rows = [
      row("r1", "2026-10-24", "ビッグハウス一関店", -1176, "なし"),
      row("c1", "2026-10-24", "スーパーアークス 一関店", -1176, "ファミマカード"),
      row("c2", "2026-10-25", "スーパーアークス 一関店", -2000, "ファミマカード"),
      row("r2", "2026-10-25", "ビッグハウス一関店", -300, "なし"),
      row("c3", "2026-10-25", "スーパーアークス 一関店", -301, "ファミマカード"),
      row("old", "2026-10-18", "ビッグハウス一関店", -800, "なし"),
    ];
    expect(weeklyGroceryTotal(rows, "2026-10-19")).toEqual({
      spent: 1476, receipts: 2, cardOnly: 0, unconfirmed: 2,
    });
    expect(weeklyGroceryTotal([rows[0], row("c4", "2026-10-20", "スーパーアークス 一関店", -2000, "ファミマカード")], "2026-10-19").spent).toBe(3176);
  });

  it("includes convenience and drugstore receipts without counting iD raw lines twice", () => {
    const rows = [
      { ...row("r1", "2026-10-24", "ビッグハウス一関店", -1176, "なし"), majorCategory: "食費" },
      { ...row("r2", "2026-10-24", "セブンイレブン一関樋渡店", -349, "なし"), majorCategory: "食費" },
      { ...row("r3", "2026-10-22", "薬王堂 岩手金ケ崎店", -533, "なし"), majorCategory: "日用品" },
      row("d1", "2026-10-24", "デビット 191589", -349, "ドコモＳＭＴＢネット銀行"),
      row("d2", "2026-10-22", "デビット 764095", -533, "ドコモＳＭＴＢネット銀行"),
      { ...row("lesson", "2026-10-24", "書道 8月〜11月分", -12500, "なし"), majorCategory: "教養・教育" },
    ];
    expect(weeklyGroceryTotal(rows, "2026-10-19")).toEqual({
      spent: 2058, receipts: 3, cardOnly: 0, unconfirmed: 0,
    });
  });
});
