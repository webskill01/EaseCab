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

  it('never-subscribed user gets the Join banner → membership', async () => {
    const onUpgrade = vi.fn()
    const user = userEvent.setup()
    renderWithIntl(<FeedBanner membership={{ state: MEMBERSHIP_STATE.NONE }} onUpgrade={onUpgrade} />)
    expect(screen.getByText('Become an EaseCab member')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /join now/i }))
    expect(onUpgrade).toHaveBeenCalled()
  })

  it('active member with ≤7 days left gets the ending banner', () => {
    renderWithIntl(<FeedBanner membership={{ state: MEMBERSHIP_STATE.ACTIVE, daysLeft: 3 }} onUpgrade={vi.fn()} />)
    expect(screen.getByText('Membership ends in 3 days')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /renew/i })).toBeInTheDocument()
  })

  it('singular day copy', () => {
    renderWithIntl(<FeedBanner membership={{ state: MEMBERSHIP_STATE.ACTIVE, daysLeft: 1 }} onUpgrade={vi.fn()} />)
    expect(screen.getByText('Membership ends in 1 day')).toBeInTheDocument()
  })

  it('active member with 8+ days left sees nothing', () => {
    const { container } = renderWithIntl(<FeedBanner membership={{ state: MEMBERSHIP_STATE.ACTIVE, daysLeft: 8 }} onUpgrade={vi.fn()} />)
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
