import { vi, describe, it, expect, beforeEach } from 'vitest'

// api/client をモック
vi.mock('../api/client', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}))

import { apiGet, apiPost } from '../api/client'
import {
  fetchCurrentMonthly,
  fetchMonthlyHistory,
} from '../api/monthly'

describe('fetchCurrentMonthly', () => {
  beforeEach(() => vi.clearAllMocks())

  it('success=true のとき data を返す', async () => {
    const mockData = {
      cycle_id: 1,
      cycle_date: '2026-03',
      status: 'open',
      salary: 300000,
      salary_account_id: 1,
      salary_account_name: 'メイン口座',
      salary_received: false,
      items: [],
    }
    vi.mocked(apiGet).mockResolvedValue({ success: true, data: mockData, error: null })
    const result = await fetchCurrentMonthly()
    expect(result).toEqual(mockData)
  })

  it('success=false のとき null を返す', async () => {
    vi.mocked(apiGet).mockResolvedValue({ success: false, data: null, error: '月次なし' })
    const result = await fetchCurrentMonthly()
    expect(result).toBeNull()
  })
})

describe('fetchMonthlyHistory', () => {
  beforeEach(() => vi.clearAllMocks())

  it('履歴の配列を返す', async () => {
    const mockData = [
      { id: 1, cycle_date: '2026-03', total_planned: 80000, total_actual: 82000 },
      { id: 2, cycle_date: '2026-02', total_planned: 78000, total_actual: 79000 },
    ]
    vi.mocked(apiGet).mockResolvedValue({ success: true, data: mockData, error: null })
    const result = await fetchMonthlyHistory()
    expect(result).toHaveLength(2)
    expect(result[0].cycle_date).toBe('2026-03')
  })
})

// apiPost の呼び出し確認
describe('monthly API mutations', () => {
  beforeEach(() => vi.clearAllMocks())

  it('pay 時に apiPost が正しいパスで呼ばれる', async () => {
    vi.mocked(apiPost).mockResolvedValue({ success: true, data: null, error: null })
    const { payFixedCost } = await import('../api/monthly')
    await payFixedCost({ monthly_fixed_cost_id: 42, account_id: 1, amount: 10000, paid_date: '2026-03-25' })
    expect(apiPost).toHaveBeenCalledWith('/monthly/pay.php', expect.objectContaining({ monthly_fixed_cost_id: 42 }))
  })
})
