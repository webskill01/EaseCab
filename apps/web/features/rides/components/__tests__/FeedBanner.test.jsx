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

  it('renders nothing for a never-subscribed user (gate fires only at contact)', () => {
    const { container } = renderWithIntl(<FeedBanner membership={{ state: MEMBERSHIP_STATE.NONE }} onUpgrade={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('expired banner shows Renew', async () => {
    const onUpgrade = vi.fn()
    const user = userEvent.setup()
    renderWithIntl(<FeedBanner membership={{ state: MEMBERSHIP_STATE.EXPIRED }} onUpgrade={onUpgrade} />)
    expect(screen.getByText('Membership ended')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /renew/i }))
    expect(onUpgrade).toHaveBeenCalled()
  })
})
