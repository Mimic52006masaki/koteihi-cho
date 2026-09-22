import { useEffect, useState } from 'react';
import { apiGet } from '../api/client';

type Payment = { id: number; account_id: number; amount: number; paid_date: string; status: string };
type RecordItem = {
  id: number; source_key: string; status: string; reason: string; updated_at: string;
  raw: { description: string; amount: number; paid_date: string; account_id: number };
  decision: { target: { name: string; amount: number; actual_amount: number | null; default_account_id: number | null } | null; payments: Payment[] };
};
type Page = { items: RecordItem[]; next_cursor: number | null };
const yen = (value: number) => `${Number(value).toLocaleString('ja-JP')}円`;

export default function ImportReview() {
  const [status, setStatus] = useState('held');
  const [page, setPage] = useState<Page>({ items: [], next_cursor: null });
  const [cursor, setCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    apiGet<Page>(`/imports/index.php?status=${status}${cursor ? `&before=${cursor}` : ''}`)
      .then(res => {
        if (!active) return;
        if (!res.success || !res.data) throw new Error('取込履歴を取得できませんでした');
        setPage(res.data);
      })
      .catch(() => { if (active) setError('取込履歴を取得できませんでした。再読み込みしてください。'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [status, cursor, refresh]);
  const reload = () => { setLoading(true); setError(''); setRefresh(n => n + 1); };
  return <section className="max-w-5xl mx-auto p-4 space-y-4">
    <h1 className="text-2xl font-bold">明細の要確認</h1>
    <p className="text-gray-600">銀行明細と固定費の登録内容を比較できます。確認した内容を取込担当へ伝えると、再照合して反映します。</p>
    <div className="flex flex-wrap items-center gap-3">
      <label>表示する状態 <select aria-label="表示する状態" className="border rounded p-2" value={status} onChange={e => { setStatus(e.target.value); setCursor(null); setLoading(true); setError(''); }}>
        <option value="held">要確認</option><option value="applied">反映済み</option>
      </select></label>
      <button className="border rounded px-3 py-2" onClick={reload}>再読み込み</button>
    </div>
    {loading ? <p role="status">読み込み中…</p> : error ? <p role="alert" className="text-red-700">{error}</p> : <>
      {page.items.length === 0 && <p>{status === 'held' ? '要確認の明細はありません。' : '反映済みの明細はありません。'}</p>}
      {page.items.map(item => <article key={item.id} className="bg-white border rounded-xl p-4 space-y-3">
        <h2 className="font-bold text-lg">{item.raw.description}</h2>
        <p className={item.status === 'held' ? 'text-amber-800' : 'text-green-800'}>{item.reason}</p>
        <div className="grid md:grid-cols-2 gap-4">
          <div><h3 className="font-semibold">銀行の原明細</h3><p>{item.raw.paid_date} · {yen(item.raw.amount)} · 口座 #{item.raw.account_id}</p></div>
          <div><h3 className="font-semibold">照合時の登録内容</h3>
            {item.decision.target ? <><p>{item.decision.target.name} · 予定 {yen(item.decision.target.amount)}</p><p>実績 {item.decision.target.actual_amount === null ? '未登録' : yen(item.decision.target.actual_amount)} · 既定口座 #{item.decision.target.default_account_id ?? '未設定'}</p></> : <p>対応する月次項目が未確定</p>}
            {item.decision.payments.map(p => <p key={p.id}>支払い #{p.id}：{p.paid_date} · {yen(p.amount)} · 口座 #{p.account_id}（{p.status === 'paid' ? '支払済み' : p.status === 'unpaid' ? '未払い' : 'スキップ'}）</p>)}
          </div>
        </div>
        <p className="text-sm text-gray-500">受付 #{item.id} · 最終照合 {item.updated_at}</p>
      </article>)}
      <div className="flex gap-3">
        {cursor && <button className="border rounded px-3 py-2" onClick={() => { setCursor(null); setLoading(true); }}>先頭へ</button>}
        {page.next_cursor && <button className="border rounded px-3 py-2" onClick={() => { setCursor(page.next_cursor); setLoading(true); }}>次の50件</button>}
      </div>
    </>}
  </section>;
}
