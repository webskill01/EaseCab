import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithIntl } from '@/test/intl'
import { FeedBanner } from '../FeedBanner'
import { MEMBERSHIP_STATE } from '@/features/subscription/lib/membership'

describe('FeedBanner', () => {
  it('renders nothing for an active member', () => {
    const { container } = renderWithIntl(<FeedBanner membership={{ state: MEMBERSHIP_STATE.ACTIVE }} onUpgrade={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing while membership is still loading (no expired flash)', () => {
    const { container } = renderWithIntl(<FeedBanner membership={{ state: null }} onUpgrade={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('trial banner shows days left + Upgrade', async () => {
    const onUpgrade = vi.fn()
    const user = userEvent.setup()
    renderWithIntl(<FeedBanner membership={{ state: MEMBERSHIP_STATE.TRIAL, daysLeft: 5 }} onUpgrade={onUpgrade} />)
    expect(screen.getByText(/5 days left/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /upgrade/i }))
    expect(onUpgrade).toHaveBeenCalled()
  })

  it('expired banner shows Renew', () => {
    renderWithIntl(<FeedBanner membership={{ state: MEMBERSHIP_STATE.EXPIRED }} onUpgrade={vi.fn()} />)
    expect(screen.getByText(/trial ended/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /renew/i })).toBeInTheDocument()
  })
})
