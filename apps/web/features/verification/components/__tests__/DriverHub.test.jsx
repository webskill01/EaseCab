import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithIntl } from '@/test/intl'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
import { DriverHub } from '../DriverHub'

beforeEach(() => vi.clearAllMocks())

describe('DriverHub', () => {
  it('routes to the dedicated DL and RC pages', () => {
    renderWithIntl(<DriverHub status={{ dlSubmitted: false, rcSubmitted: true }} />)
    fireEvent.click(screen.getByText(/driving licence/i))
    expect(push).toHaveBeenCalledWith('/verify?intent=dl')
    fireEvent.click(screen.getByText(/vehicle rc/i))
    expect(push).toHaveBeenCalledWith('/verify?intent=rc')
  })
})
