import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ImportReview from '../pages/ImportReview';
import { apiGet } from '../api/client';
vi.mock('../api/client', () => ({ apiGet: vi.fn() }));
const get = vi.mocked(apiGet);
beforeEach(() => vi.clearAllMocks());
describe('ImportReview', () => {
  it('shows source and conflicting payment without an apply button', async () => {
    get.mockResolvedValue({ success: true, error: null, data: { items: [{ id: 1, source_key: 'test', status: 'held', reason: '口座が不一致', updated_at: '2026-09-22', raw: { description: 'KDDI', amount: 14552, paid_date: '2026-09-20', account_id: 3 }, decision: { target: { name: '通信費', amount: 14000, actual_amount: 14552, default_account_id: 1 }, payments: [{ id: 5, amount: 14552, account_id: 1, paid_date: '2026-09-20', status: 'paid' }] } }], next_cursor: null } });
    render(<ImportReview />);
    expect(await screen.findByText('口座が不一致')).toBeInTheDocument();
    expect(screen.getByText('KDDI')).toBeInTheDocument();
    expect(screen.getByText(/支払い #5/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '反映' })).not.toBeInTheDocument();
  });
  it('distinguishes a fetch failure from an empty queue and supports retry', async () => {
    get.mockRejectedValueOnce(new Error('offline'));
    render(<ImportReview />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('要確認の明細はありません。')).not.toBeInTheDocument();
    get.mockResolvedValue({ success: true, error: null, data: { items: [], next_cursor: null } });
    fireEvent.click(screen.getByText('再読み込み'));
    expect(await screen.findByText('要確認の明細はありません。')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('表示する状態'), { target: { value: 'applied' } });
    await waitFor(() => expect(get).toHaveBeenLastCalledWith('/imports/index.php?status=applied'));
  });
});
