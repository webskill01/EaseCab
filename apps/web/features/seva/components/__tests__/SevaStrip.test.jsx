import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithIntl } from '@/test/intl'
import { SevaStrip } from '../SevaStrip'

const seva = vi.hoisted(() => ({ openBorderTax: vi.fn(), openFuel: vi.fn(), openWaGroup: vi.fn(), openRefer: vi.fn(), sheet: null, close: vi.fn() }))
vi.mock('../../hooks/useSevaActions', () => ({ useSevaActions: () => seva }))

describe('SevaStrip', () => {
  it('shows all four services in one non-scrolling row; Fuel is tagged new and opens the finder', async () => {
    renderWithIntl(<SevaStrip />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.map((b) => b.textContent)).toEqual(['FreeBorder Tax', 'NewFuel / CNG', 'WhatsApp Group', 'Refer & Earn'])
    expect(buttons[0].parentElement.className).toContain('grid-cols-4')
    expect(buttons[0].parentElement.className).not.toContain('overflow-x')
    await userEvent.setup().click(buttons[1])
    expect(seva.openFuel).toHaveBeenCalled()
  })
})
