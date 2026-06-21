import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithIntl } from '@/test/intl'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

const hook = vi.fn()
vi.mock('../../hooks/useBlocks', () => ({ useBlocks: () => hook() }))
import { BlockedUsersScreen } from '../BlockedUsersScreen'

beforeEach(() => vi.clearAllMocks())

describe('BlockedUsersScreen', () => {
  it('renders a row per blocked user with an unblock button', () => {
    const unblock = vi.fn()
    hook.mockReturnValue({ blocks: [{ id: 'b1', blockedId: 'u2', name: 'Raj', baseCity: 'Ludhiana' }], isLoading: false, isError: false, unblock, unblockingId: null })
    renderWithIntl(<BlockedUsersScreen />)
    expect(screen.getByText('Raj')).toBeInTheDocument()
    expect(screen.getByText('Ludhiana')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Unblock'))
    expect(unblock).toHaveBeenCalledWith('u2')
  })

  it('shows the empty state when there are no blocks', () => {
    hook.mockReturnValue({ blocks: [], isLoading: false, isError: false, unblock: vi.fn(), unblockingId: null })
    renderWithIntl(<BlockedUsersScreen />)
    expect(screen.getByText('No blocked users')).toBeInTheDocument()
  })

  it('disables the row button and shows progress label while unblocking', () => {
    hook.mockReturnValue({ blocks: [{ id: 'b1', blockedId: 'u2', name: 'Raj' }], isLoading: false, isError: false, unblock: vi.fn(), unblockingId: 'u2' })
    renderWithIntl(<BlockedUsersScreen />)
    const btn = screen.getByText('Unblocking…')
    expect(btn).toBeDisabled()
  })

  it('renders the error state on load failure', () => {
    hook.mockReturnValue({ blocks: [], isLoading: false, isError: true, unblock: vi.fn(), unblockingId: null })
    renderWithIntl(<BlockedUsersScreen />)
    expect(screen.getByText("Couldn't load your profile.")).toBeInTheDocument()
  })
})
