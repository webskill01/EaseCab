import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithIntl } from '@/test/intl'
import { DoneScreen } from '../DoneScreen'

vi.mock('@/features/referrals/hooks/useReferrals', () => ({
  useReferrals: vi.fn(() => ({ data: { enabled: false } })),
  useClaimReferrer: () => ({ mutate: vi.fn(), isPending: false, isSuccess: false, error: null }),
}))
import { useReferrals } from '@/features/referrals/hooks/useReferrals'

describe('DoneScreen', () => {
  it('shows the welcome (no trial) and enters the app', async () => {
    const onEnter = vi.fn()
    const user = userEvent.setup()
    renderWithIntl(<DoneScreen onEnter={onEnter} />)
    expect(screen.getByText(/you're all set/i)).toBeInTheDocument()
    expect(screen.getByText(/Browse live duties free/)).toBeInTheDocument()
    expect(screen.queryByText(/trial/i)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /enter easecab/i }))
    expect(onEnter).toHaveBeenCalled()
  })

  it('asks who referred you only for rollout users inside the window', () => {
    useReferrals.mockReturnValue({ data: { enabled: true, canClaim: true } })
    renderWithIntl(<DoneScreen onEnter={() => {}} />)
    expect(screen.getByText('Who told you about EaseCab?')).toBeInTheDocument()
  })
})
