import type { MonthlyCostItem } from "../types";

/**
 * 未払い項目だけを新しい順序に並べ替える。
 *
 * 未払いが元々占めていた位置（枠）はそのままに、その中身だけを入れ替える。
 * 実行済み項目の位置は動かさない。サーバー側の並べ替えも同じ規則なので、
 * 楽観更新と保存後の再取得で並びがずれない。
 *
 * nextIds に無い未払い項目があった場合は、元の並びのまま後ろへ残す。
 */
export function applyUnpaidOrder<T extends Pick<MonthlyCostItem, "id" | "paid_amount">>(
  items: T[],
  nextIds: number[]
): T[] {
  const unpaid = items.filter((i) => i.paid_amount === null);
  const byId = new Map(unpaid.map((i) => [i.id, i]));

  const ordered: T[] = [];
  for (const id of nextIds) {
    const item = byId.get(id);
    if (item) {
      ordered.push(item);
      byId.delete(id);
    }
  }
  // nextIds に含まれていなかった未払いは元の順序で後ろに付ける
  for (const item of unpaid) {
    if (byId.has(item.id)) ordered.push(item);
  }

  let cursor = 0;
  return items.map((i) => (i.paid_amount === null ? ordered[cursor++] : i));
}
