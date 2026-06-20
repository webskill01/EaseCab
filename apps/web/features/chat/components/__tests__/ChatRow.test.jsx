import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithIntl } from '@/test/intl'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
import { ChatRow } from '../ChatRow'

describe('ChatRow', () => {
  it('renders the other-party name, preview and unread pill', () => {
    renderWithIntl(<ChatRow chat={{ id: 'c1', otherName: 'Driver Singh', fromCityName: 'Ludhiana', toCityName: 'Delhi', lastMessageText: 'on my way', lastMessageAt: '2026-06-13T01:00:00Z', unreadCount: 2 }} />)
    expect(screen.getByText('Driver Singh')).toBeInTheDocument()
    expect(screen.getByText('on my way')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('falls back to the route as title and the no-messages preview', () => {
    renderWithIntl(<ChatRow chat={{ id: 'c2', otherName: null, fromCityName: 'Mohali', toCityName: 'Panchkula', lastMessageText: null, lastMessageAt: null, unreadCount: 0 }} />)
    expect(screen.getByText('Mohali → Panchkula')).toBeInTheDocument()
    expect(screen.getByText('No messages yet')).toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('shows a verified shield only when the other party is verified', () => {
    const plain = renderWithIntl(<ChatRow chat={{ id: 'c1', otherName: 'A', otherVerified: false, unreadCount: 0 }} />)
    expect(plain.container.querySelector('svg')).toBeNull() // no shield (avatar is a text initial)
    const verified = renderWithIntl(<ChatRow chat={{ id: 'c2', otherName: 'A', otherVerified: true, unreadCount: 0 }} />)
    expect(verified.container.querySelector('svg')).not.toBeNull()
  })
})
