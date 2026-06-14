import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AdminGuard } from '../AdminGuard'
import { adminMe } from '../../services/adminApi'

vi.mock('../../services/adminApi', () => ({ adminMe: vi.fn() }))
const replace = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }))

beforeEach(() => { vi.clearAllMocks() })

describe('AdminGuard', () => {
  it('renders children when /me resolves', async () => {
    adminMe.mockResolvedValue({ id: 'a1' })
    render(<AdminGuard><div>secret</div></AdminGuard>)
    await waitFor(() => expect(screen.getByText('secret')).toBeInTheDocument())
    expect(replace).not.toHaveBeenCalled()
  })

  it('redirects to /login when /me rejects', async () => {
    adminMe.mockRejectedValue({ code: 'AUTH_REQUIRED' })
    render(<AdminGuard><div>secret</div></AdminGuard>)
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'))
    expect(screen.queryByText('secret')).not.toBeInTheDocument()
  })
})
