import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Settings from '../pages/Settings';
import { fetchSettings, updateProfileName } from '../api/settings';
import { fetchAccounts } from '../api/accounts';
import { fetchWeeklyBudget, updateWeeklyBudget } from '../api/weeklyBudget';

const setUser = vi.fn();
vi.mock('../api/settings', () => ({ fetchSettings: vi.fn(), updateProfileName: vi.fn() }));
vi.mock('../api/accounts', () => ({ fetchAccounts: vi.fn() }));
vi.mock('../api/weeklyBudget', () => ({ fetchWeeklyBudget: vi.fn(), updateWeeklyBudget: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, name: 'Admin' }, setUser, loading: false }),
}));

const renderSettings = async () => {
  const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter><Settings /></MemoryRouter>
    </QueryClientProvider>
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchSettings).mockResolvedValue({ bank_balance: 0, safety_margin: 0 });
  vi.mocked(fetchAccounts).mockResolvedValue([]);
  vi.mocked(fetchWeeklyBudget).mockResolvedValue({
    week_start: '2026-10-19', budget_amount: 10000, next_week_start: '2026-10-26', next_budget_amount: 10000,
  });
});

describe('Settings の週の買い物予算', () => {
  it('今週の予算はそのままで、次の月曜からの金額を保存する', async () => {
    vi.mocked(updateWeeklyBudget).mockResolvedValue({
      week_start: '2026-10-19', budget_amount: 10000, next_week_start: '2026-10-26', next_budget_amount: 8000,
    });
    await renderSettings();
    const input = await screen.findByLabelText('週の買い物予算');
    await waitFor(() => expect(input).toHaveValue(10000));
    expect(screen.getByRole('button', { name: '予算を保存' })).toBeDisabled();

    fireEvent.change(input, { target: { value: '8000' } });
    fireEvent.click(screen.getByRole('button', { name: '予算を保存' }));

    await waitFor(() => expect(updateWeeklyBudget).toHaveBeenCalledWith(8000));
    expect(await screen.findByText('¥8,000')).toBeInTheDocument();
    expect(screen.getByText(/10\/26（月）から/)).toBeInTheDocument();
  });

  it('0円や小数は保存できない', async () => {
    await renderSettings();
    const input = await screen.findByLabelText('週の買い物予算');
    await waitFor(() => expect(input).toHaveValue(10000));
    fireEvent.change(input, { target: { value: '0' } });
    expect(screen.getByRole('button', { name: '予算を保存' })).toBeDisabled();
    fireEvent.change(input, { target: { value: '1.5' } });
    expect(screen.getByRole('button', { name: '予算を保存' })).toBeDisabled();
  });
});

describe('Settings の表示名', () => {
  it('現在の名前を初期値にし、変更していない間は保存できない', async () => {
    await renderSettings();
    const input = await screen.findByLabelText('表示名');
    expect(input).toHaveValue('Admin');
    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled();
  });

  it('変更して保存すると API を叩き、ヘッダー用の user も更新する', async () => {
    vi.mocked(updateProfileName).mockResolvedValue({ success: true, error: null, data: { name: 'まさき' } });
    await renderSettings();
    const input = await screen.findByLabelText('表示名');

    fireEvent.change(input, { target: { value: '  まさき  ' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    // 前後の空白は落として送る
    await waitFor(() => expect(updateProfileName).toHaveBeenCalledWith('まさき'));
    await waitFor(() => expect(setUser).toHaveBeenCalledWith({ id: 1, name: 'まさき' }));
  });

  it('空白だけにしても保存できない', async () => {
    await renderSettings();
    const input = await screen.findByLabelText('表示名');
    fireEvent.change(input, { target: { value: '   ' } });
    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled();
    expect(updateProfileName).not.toHaveBeenCalled();
  });
});
