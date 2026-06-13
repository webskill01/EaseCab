import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithIntl } from '@/test/intl'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/features/chat/services/chatApi', () => ({ openChat: vi.fn() }))

import { openChat } from '@/features/chat/services/chatApi'
import { ContactedCard } from '../ContactedCard'

beforeEach(() => vi.clearAllMocks())

describe('ContactedCard', () => {
  it('renders route + call/whatsapp deep links to the revealed phone', () => {
    renderWithIntl(<ContactedCard contact={{ id: 'k1', kind: 'bot', from: 'Ludhiana', to: 'Delhi', vehicleType: 'Sedan', phone: '+919876500000' }} />)
    expect(screen.getByText('Ludhiana')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /call/i })).toHaveAttribute('href', 'tel:+919876500000')
  })

  it('opens (or reuses) the chat and navigates for a verified contact', async () => {
    openChat.mockResolvedValue({ id: 'chat-9' })
    renderWithIntl(<ContactedCard contact={{ id: 'k2', kind: 'verified', postedRideId: 'p2', from: 'A', to: 'B', vehicleType: null, phone: '+910000000000' }} />)
    fireEvent.click(screen.getByRole('button', { name: /chat/i }))
    await waitFor(() => expect(openChat).toHaveBeenCalledWith('p2'))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/messages/chat-9'))
  })
})
