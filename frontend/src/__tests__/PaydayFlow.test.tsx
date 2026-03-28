import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import PaydayFlow from '../pages/PaydayFlow'

vi.mock('../api/salary', () => ({
  fetchPaydayStatus: vi.fn(),
  executeSalary: vi.fn(),
}))

vi.mock('../api/transfer', () => ({
  executeTransfer: vi.fn(),
}))

import { fetchPaydayStatus } from '../api/salary'

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <MemoryRouter>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </MemoryRouter>
  )
}

describe('PaydayFlow', () => {
  it('月次なしのとき案内メッセージを表示する', async () => {
    vi.mocked(fetchPaydayStatus).mockResolvedValue(null)
    render(<PaydayFlow />, { wrapper })
    expect(await screen.findByText('進行中の月次がありません')).toBeInTheDocument()
  })

  it('全ステップ未完了の場合、3つのステップカードが表示される', async () => {
    vi.mocked(fetchPaydayStatus).mockResolvedValue({
      cycle_id: 1,
      cycle_date: '2026-03',
      salary: 300000,
      salary_account_id: 1,
      salary_account_name: 'メイン口座',
      salary_received: false,
      transfer_done: false,
      paid_count: 0,
      total_count: 5,
    })
    render(<PaydayFlow />, { wrapper })
    expect(await screen.findByText('給与受取')).toBeInTheDocument()
    expect(screen.getByText('振替実行')).toBeInTheDocument()
    expect(screen.getByText('固定費支払い')).toBeInTheDocument()
  })

  it('給与受取済みなら Step1 が「完了」になる', async () => {
    vi.mocked(fetchPaydayStatus).mockResolvedValue({
      cycle_id: 1,
      cycle_date: '2026-03',
      salary: 300000,
      salary_account_id: 1,
      salary_account_name: 'メイン口座',
      salary_received: true,
      transfer_done: false,
      paid_count: 0,
      total_count: 5,
    })
    render(<PaydayFlow />, { wrapper })
    await screen.findByText('給与受取')
    // 完了バッジが Step1 ヘッダーに出る
    const doneLabels = screen.getAllByText('完了')
    expect(doneLabels.length).toBeGreaterThanOrEqual(1)
  })

  it('全ステップ完了のとき完了バナーが表示される', async () => {
    vi.mocked(fetchPaydayStatus).mockResolvedValue({
      cycle_id: 1,
      cycle_date: '2026-03',
      salary: 300000,
      salary_account_id: 1,
      salary_account_name: 'メイン口座',
      salary_received: true,
      transfer_done: true,
      paid_count: 5,
      total_count: 5,
    })
    render(<PaydayFlow />, { wrapper })
    expect(
      await screen.findByText('今月の給料日フローが全て完了しました！')
    ).toBeInTheDocument()
  })

  it('給与未設定のとき警告メッセージが表示される', async () => {
    vi.mocked(fetchPaydayStatus).mockResolvedValue({
      cycle_id: 1,
      cycle_date: '2026-03',
      salary: 0,
      salary_account_id: null,
      salary_account_name: null,
      salary_received: false,
      transfer_done: false,
      paid_count: 0,
      total_count: 5,
    })
    render(<PaydayFlow />, { wrapper })
    expect(await screen.findByText(/給与額・振込口座が未設定/)).toBeInTheDocument()
  })
})
