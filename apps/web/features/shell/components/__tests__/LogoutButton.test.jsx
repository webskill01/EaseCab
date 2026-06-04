import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithIntl } from '@/test/intl'

const replace = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }))
vi.mock('@/features/auth/services/authApi', () => ({ logout: vi.fn() }))
import { logout } from '@/features/auth/services/authApi'
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
})
