import { describe, it, expect } from 'vitest';
import { applyUnpaidOrder } from '../lib/reorderCosts';

type Row = { id: number; paid_amount: number | null };
const rows = (...specs: [number, number | null][]): Row[] =>
  specs.map(([id, paid_amount]) => ({ id, paid_amount }));

const ids = (list: Row[]) => list.map((r) => r.id);

describe('applyUnpaidOrder', () => {
  it('未払いだけを入れ替え、実行済みの位置は動かさない', () => {
    // 2件目が実行済み。未払いは 1, 3, 4
    const items = rows([1, null], [2, 8000], [3, null], [4, null]);
    const result = applyUnpaidOrder(items, [4, 1, 3]);

    expect(ids(result)).toEqual([4, 2, 1, 3]);
    // 実行済みは元の位置のまま
    expect(result[1]).toEqual({ id: 2, paid_amount: 8000 });
  });

  it('未払いが無ければ何も変えない', () => {
    const items = rows([1, 100], [2, 200]);
    expect(applyUnpaidOrder(items, [2, 1])).toEqual(items);
  });

  it('nextIds に無い未払いは元の順序で後ろに残す', () => {
    const items = rows([1, null], [2, null], [3, null]);
    expect(ids(applyUnpaidOrder(items, [3]))).toEqual([3, 1, 2]);
  });

  it('知らないIDが混ざっても件数が崩れない', () => {
    const items = rows([1, null], [2, null]);
    const result = applyUnpaidOrder(items, [99, 2, 1]);
    expect(ids(result)).toEqual([2, 1]);
    expect(result).toHaveLength(2);
  });
});
