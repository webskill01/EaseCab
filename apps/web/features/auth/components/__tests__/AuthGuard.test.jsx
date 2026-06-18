import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithIntl } from '@/test/intl'

const replace = vi.fn()
// Stable router reference (as the real next/navigation hook is) so effects keyed on
// `router` don't churn between renders.
const router = { replace }
vi.mock('next/navigation', () => ({ useRouter: () => router }))
vi.mock('../../services/authApi', () => ({ refreshSession: vi.fn() }))
import { refreshSession } from '../../services/authApi'
import { AuthGuard, SESSION_REFRESH_INTERVAL_MS } from '../AuthGuard'

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

  it('keeps the session alive by refreshing on an interval after auth (covers the SSE stream)', async () => {
    vi.useFakeTimers()
    try {
      refreshSession.mockResolvedValue({ data: { refreshed: true } })
      renderWithIntl(<AuthGuard><p>secret feed</p></AuthGuard>)
      // Flush the mount probe + the resulting authed re-render (which starts the interval).
      await vi.advanceTimersByTimeAsync(0)
      expect(refreshSession).toHaveBeenCalledTimes(1)
      // One interval later → a second, proactive refresh — without any remount/navigation.
      await vi.advanceTimersByTimeAsync(SESSION_REFRESH_INTERVAL_MS)
      expect(refreshSession).toHaveBeenCalledTimes(2)
      expect(replace).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })
})
