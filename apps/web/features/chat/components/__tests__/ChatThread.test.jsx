import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithIntl } from '@/test/intl'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/features/profile/hooks/useProfile', () => ({ useProfile: () => ({ data: { id: 'me' } }) }))
vi.mock('../../hooks/useChatThread', () => ({ useChatThread: vi.fn() }))
vi.mock('../../hooks/useChatPresence', () => ({ useChatPresence: vi.fn() }))

import { useChatThread } from '../../hooks/useChatThread'
import { ChatThread } from '../ChatThread'

beforeEach(() => vi.clearAllMocks())

describe('ChatThread', () => {
  it('disables the composer when the ride has expired (read-only)', () => {
    useChatThread.mockReturnValue({ meta: { isActive: false }, live: [], pending: [], isActive: false, send: vi.fn() })
    renderWithIntl(<ChatThread chatId="c1" />)
    expect(screen.getByPlaceholderText(/read-only/i)).toBeDisabled()
  })

  it('renders live message bubbles when active', () => {
    useChatThread.mockReturnValue({ meta: { isActive: true, posterId: 'other' }, live: [{ id: 'm1', senderId: 'other', messageText: 'hey there', sentAt: 'x' }], pending: [], isActive: true, send: vi.fn() })
    renderWithIntl(<ChatThread chatId="c1" />)
    expect(screen.getByText('hey there')).toBeInTheDocument()
  })

  it('opens the overflow menu with Report + Block', () => {
    useChatThread.mockReturnValue({ meta: { isActive: true, posterId: 'other', postedRideId: 'p1' }, live: [], pending: [], isActive: true, send: vi.fn() })
    renderWithIntl(<ChatThread chatId="c1" />)
    expect(screen.queryByText('Block user')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /more options/i }))
    expect(screen.getByText('Report')).toBeInTheDocument()
    expect(screen.getByText('Block user')).toBeInTheDocument()
  })

  it('shows the Online indicator when the other party is recently active', () => {
    useChatThread.mockReturnValue({ meta: { isActive: true, posterId: 'other', posterLastActiveAt: new Date().toISOString() }, live: [], pending: [], isActive: true, send: vi.fn() })
    renderWithIntl(<ChatThread chatId="c1" />)
    expect(screen.getByText('Online')).toBeInTheDocument()
  })

  it('shows a last-seen subtitle when the other party went stale', () => {
    const tenMinAgo = new Date(Date.now() - 10 * 60_000).toISOString()
    useChatThread.mockReturnValue({ meta: { isActive: true, posterId: 'other', posterLastActiveAt: tenMinAgo }, live: [], pending: [], isActive: true, send: vi.fn() })
    renderWithIntl(<ChatThread chatId="c1" />)
    expect(screen.getByText(/last seen/i)).toBeInTheDocument()
    expect(screen.queryByText('Online')).toBeNull()
  })
})
