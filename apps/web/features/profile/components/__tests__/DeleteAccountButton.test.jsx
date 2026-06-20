import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithIntl } from '@/test/intl'

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }))
vi.mock('../../services/accountApi', () => ({ deleteAccount: vi.fn().mockResolvedValue({ deleted: true }) }))
vi.mock('@/features/notifications/services/pushApi', () => ({ unregisterToken: vi.fn() }))
vi.mock('@/features/notifications/lib/pushStorage', () => ({ getStoredToken: () => null, clearStoredToken: vi.fn() }))

import { deleteAccount } from '../../services/accountApi'
import { DeleteAccountButton } from '../DeleteAccountButton'

beforeEach(() => vi.clearAllMocks())

describe('DeleteAccountButton', () => {
  it('opens the confirm sheet then deletes + redirects to /login', async () => {
    renderWithIntl(<DeleteAccountButton />)
    fireEvent.click(screen.getByRole('button', { name: /delete account/i }))
    // Sheet's confirm button (there are now two "Delete account" buttons — pick the last).
    const confirms = screen.getAllByRole('button', { name: /delete account/i })
    fireEvent.click(confirms[confirms.length - 1])
    await waitFor(() => expect(deleteAccount).toHaveBeenCalled())
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'))
  })

  it('Cancel closes the sheet without deleting', () => {
    renderWithIntl(<DeleteAccountButton />)
    fireEvent.click(screen.getByRole('button', { name: /delete account/i }))
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(deleteAccount).not.toHaveBeenCalled()
  })
})
