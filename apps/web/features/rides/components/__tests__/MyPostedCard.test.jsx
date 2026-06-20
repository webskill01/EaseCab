import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithIntl } from '@/test/intl'

const { push } = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
import { MyPostedCard } from '../MyPostedCard'
import { takeRepostDraft } from '../../lib/repostDraft'

const VM = { id: 'p1', fromCityId: 'c1', toCityId: 'c2', from: 'Mohali', to: 'Manali', vehicleType: 'Innova', fare: 4200, date: null, status: 'active', isClosed: false }

beforeEach(() => { push.mockClear(); sessionStorage.clear() })

describe('MyPostedCard', () => {
  it('renders the route and fires mark-done + delete', () => {
    const onDone = vi.fn(); const onDelete = vi.fn()
    renderWithIntl(<MyPostedCard post={VM} onMarkDone={onDone} onDelete={onDelete} />)
    expect(screen.getByText('Mohali')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /mark done/i }))
    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    expect(onDone).toHaveBeenCalledWith(VM)
    expect(onDelete).toHaveBeenCalledWith(VM)
  })

  it('hides the actions for an already-done post', () => {
    renderWithIntl(<MyPostedCard post={{ ...VM, status: 'done', isClosed: true }} onMarkDone={() => {}} onDelete={() => {}} />)
    expect(screen.queryByRole('button', { name: /mark done/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /repost/i })).toBeNull()
  })

  it('shows a chat-count badge when chatCount > 0, hidden otherwise', () => {
    renderWithIntl(<MyPostedCard post={VM} onMarkDone={() => {}} onDelete={() => {}} />)
    expect(screen.queryByText('3')).toBeNull() // VM has no chatCount
  })

  it('renders the chat-count badge value', () => {
    renderWithIntl(<MyPostedCard post={{ ...VM, chatCount: 3 }} onMarkDone={() => {}} onDelete={() => {}} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('Repost chip stashes a draft and navigates to /post', () => {
    renderWithIntl(<MyPostedCard post={VM} onMarkDone={() => {}} onDelete={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /repost/i }))
    expect(takeRepostDraft()).toEqual({
      from: { id: 'c1', name: 'Mohali' }, to: { id: 'c2', name: 'Manali' }, vehicle: 'Innova', fare: '4200', sourceId: 'p1',
    })
    expect(push).toHaveBeenCalledWith('/post')
  })
})
