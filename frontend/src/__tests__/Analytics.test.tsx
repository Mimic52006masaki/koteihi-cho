import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import Analytics from '../pages/Analytics'

vi.mock('../api/monthly', () => ({
  fetchMonthlyHistory: vi.fn(),
}))

import { fetchMonthlyHistory } from '../api/monthly'

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <MemoryRouter>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </MemoryRouter>
  )
}

describe('Analytics', () => {
  it('データなしのとき「データがありません」を表示する', async () => {
    vi.mocked(fetchMonthlyHistory).mockResolvedValue([])
    render(<Analytics />, { wrapper })
    expect(await screen.findByText('データがありません')).toBeInTheDocument()
  })

  it('月次データがあるときサマリーカードを表示する', async () => {
    vi.mocked(fetchMonthlyHistory).mockResolvedValue([
      {
        id: 1,
        cycle_date: '2026-03',
        total_planned: 80000,
        total_actual: 82000,
      },
      {
        id: 2,
        cycle_date: '2026-02',
        total_planned: 78000,
        total_actual: 79000,
      },
    ])
    render(<Analytics />, { wrapper })
    expect(await screen.findByText('最新月 実績')).toBeInTheDocument()
    expect(screen.getByText('全期間 月平均')).toBeInTheDocument()
    expect(screen.getByText('前月比')).toBeInTheDocument()
  })

  it('年次サマリーテーブルに年が表示される', async () => {
    vi.mocked(fetchMonthlyHistory).mockResolvedValue([
      { id: 1, cycle_date: '2026-03', total_planned: 80000, total_actual: 82000 },
    ])
    render(<Analytics />, { wrapper })
    expect(await screen.findByText('2026年')).toBeInTheDocument()
  })
})
