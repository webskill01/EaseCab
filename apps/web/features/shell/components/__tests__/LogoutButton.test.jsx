import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithIntl } from '@/test/intl'

const replace = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }))
vi.mock('@/features/auth/services/authApi', () => ({ logout: vi.fn() }))
vi.mock('@/features/notifications/services/pushApi', () => ({ unregisterToken: vi.fn(() => Promise.resolve({})) }))
vi.mock('@/features/notifications/lib/pushStorage', () => ({ getStoredToken: vi.fn(() => 'tok-1'), clearStoredToken: vi.fn() }))
import { logout } from '@/features/auth/services/authApi'
import { unregisterToken } from '@/features/notifications/services/pushApi'
import { clearStoredToken } from '@/features/notifications/lib/pushStorage'
import { LogoutButton } from '../LogoutButton'

beforeEach(() => vi.clearAllMocks())

describe('LogoutButton', () => {
  it('logs out then redirects to /login', async () => {
    logout.mockResolvedValue({ data: { loggedOut: true } })
    const user = userEvent.setup()
    renderWithIntl(<LogoutButton />)
    await user.click(screen.getByRole('button', { name: /log out/i }))
    await waitFor(() => expect(logout).toHaveBeenCalled())
    expect(replace).toHaveBeenCalledWith('/login')
  })

  it('unregisters the cached FCM token before logging out', async () => {
    logout.mockResolvedValue({ data: { loggedOut: true } })
    unregisterToken.mockResolvedValue({})
    const user = userEvent.setup()
    renderWithIntl(<LogoutButton />)
    await user.click(screen.getByRole('button', { name: /log out/i }))
    await waitFor(() => expect(unregisterToken).toHaveBeenCalledWith({ deviceToken: 'tok-1' }))
    expect(clearStoredToken).toHaveBeenCalled()
    expect(logout).toHaveBeenCalled()
  })
})
