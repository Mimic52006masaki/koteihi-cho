import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import AmountInput from '../components/AmountInput'

describe('AmountInput', () => {
  it('value=0 のとき空文字を表示する', () => {
    render(<AmountInput value={0} onChange={() => {}} />)
    const input = screen.getByRole('spinbutton')
    expect(input).toHaveValue(null)
  })

  it('value に数値を渡すとその値を表示する', () => {
    render(<AmountInput value={50000} onChange={() => {}} />)
    const input = screen.getByRole('spinbutton')
    expect(input).toHaveValue(50000)
  })

  it('入力値が変わると onChange が呼ばれる', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<AmountInput value={0} onChange={handleChange} />)
    const input = screen.getByRole('spinbutton')
    await user.type(input, '30000')
    expect(handleChange).toHaveBeenCalled()
  })

  it('空文字入力で onChange(0) を呼ぶ', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<AmountInput value={10000} onChange={handleChange} />)
    const input = screen.getByRole('spinbutton')
    await user.clear(input)
    expect(handleChange).toHaveBeenLastCalledWith(0)
  })

  it('placeholder が表示される', () => {
    render(<AmountInput value={0} onChange={() => {}} placeholder="金額を入力" />)
    expect(screen.getByPlaceholderText('金額を入力')).toBeInTheDocument()
  })
})
