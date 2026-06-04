import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithIntl } from '@/test/intl'

const replace = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }))
vi.mock('../../services/authApi', () => ({ refreshSession: vi.fn() }))
import { refreshSession } from '../../services/authApi'
import { AuthGuard } from '../AuthGuard'

beforeEach(() => vi.clearAllMocks())

describe('AuthGuard', () => {
  it('renders children once the session check resolves', async () => {
    refreshSession.mockResolvedValue({ data: { refreshed: true } })
    renderWithIntl(<AuthGuard><p>secret feed</p></AuthGuard>)
    expect(await screen.findByText('secret feed')).toBeInTheDocument()
    expect(replace).not.toHaveBeenCalled()
  })

  it('redirects to /login when the session check fails', async () => {
    refreshSession.mockRejectedValue({ code: 'AUTH_REQUIRED', status: 401 })
    renderWithIntl(<AuthGuard><p>secret feed</p></AuthGuard>)
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'))
    expect(screen.queryByText('secret feed')).not.toBeInTheDocument()
  })
})
