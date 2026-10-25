import type { Statement } from "./receiptMatching";

export type WeeklyGroceryTotal = {
  spent: number;
  unconfirmed: number;
  receipts: number;
  cardOnly: number;
};

const looksLikeStore = (name: string) => /店|スーパー|マート|薬王堂|Amazon|楽天市場/i.test(name.normalize("NFKC"));
const isShopping = (row: Statement) =>
  row.majorCategory === "食費" || row.majorCategory === "日用品" || looksLikeStore(row.description);
const day = (date: string) => Date.parse(`${date}T00:00:00Z`) / 86400000;

export function weekStartInTokyo(now = new Date()): string {
  const date = now.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  const value = new Date(`${date}T00:00:00Z`);
  const offset = (value.getUTCDay() + 6) % 7;
  value.setUTCDate(value.getUTCDate() - offset);
  return value.toISOString().slice(0, 10);
}

export function weeklyGroceryTotal(rows: Statement[], weekStart: string): WeeklyGroceryTotal {
  const unique = new Map<string, Statement>();
  for (const row of rows) {
    const prior = unique.get(row.id);
    if (prior && JSON.stringify(prior) !== JSON.stringify(row)) throw new Error(`明細ID ${row.id} に食い違いがあります`);
    unique.set(row.id, row);
  }
  const purchases = [...unique.values()].filter((row) =>
    row.date >= weekStart && day(row.date) < day(weekStart) + 7 && row.amount < 0 && !row.transfer &&
    isShopping(row));
  const receipts = purchases.filter((row) => row.account === "なし");
  const cards = purchases.filter((row) => row.account === "ファミマカード");
  let spent = receipts.reduce((sum, row) => sum - row.amount, 0);
  let unconfirmed = 0;
  let cardOnly = 0;
  for (const card of cards) {
    const nearby = receipts.filter((receipt) => Math.abs(day(receipt.date) - day(card.date)) <= 1);
    const exact = nearby.filter((receipt) => receipt.amount === card.amount);
    const competingCards = exact.length === 1 ? cards.filter((other) =>
      other.amount === exact[0].amount && Math.abs(day(other.date) - day(exact[0].date)) <= 1) : [];
    if (exact.length === 1 && competingCards.length === 1) continue;
    if (exact.length > 1 || nearby.length > 0) { unconfirmed += 1; continue; }
    spent -= card.amount;
    cardOnly += 1;
  }
  return { spent, unconfirmed, receipts: receipts.length, cardOnly };
}
