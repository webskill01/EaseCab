import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithIntl } from '@/test/intl'

vi.mock('@/features/notifications/services/fcmClient', () => ({ requestPermissionAndToken: vi.fn() }))
vi.mock('@/features/notifications/services/geoClient', () => ({ getCurrentPosition: vi.fn() }))

import { requestPermissionAndToken } from '@/features/notifications/services/fcmClient'
import { getCurrentPosition } from '@/features/notifications/services/geoClient'
import { PermissionsStep } from '../PermissionsStep'

beforeEach(() => {
  vi.clearAllMocks()
  requestPermissionAndToken.mockResolvedValue({ permission: 'granted', token: 'tok-1' })
  getCurrentPosition.mockResolvedValue({ lat: 31.63, lng: 74.87 })
})

describe('PermissionsStep', () => {
  it('shows only notifications + location — no contacts or background rows', () => {
    renderWithIntl(<PermissionsStep onContinue={vi.fn()} />)
    expect(screen.getByText(/notifications/i)).toBeInTheDocument()
    expect(screen.getByText(/location/i)).toBeInTheDocument()
    expect(screen.queryByText(/background activity/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/contacts/i)).not.toBeInTheDocument()
  })

  it('Allow all fires both OS prompts, then Continue advances', async () => {
    const onContinue = vi.fn()
    const user = userEvent.setup()
    renderWithIntl(<PermissionsStep onContinue={onContinue} />)

    await user.click(screen.getByRole('button', { name: /allow all/i }))
    await waitFor(() => expect(requestPermissionAndToken).toHaveBeenCalledTimes(1))
    expect(getCurrentPosition).toHaveBeenCalledTimes(1)

    await user.click(await screen.findByRole('button', { name: /continue/i }))
    expect(onContinue).toHaveBeenCalledTimes(1)
  })

  it('a denied prompt keeps the item off (no Continue)', async () => {
    requestPermissionAndToken.mockResolvedValue({ permission: 'denied', token: null })
    getCurrentPosition.mockRejectedValue({ code: 1 }) // PERMISSION_DENIED
    const user = userEvent.setup()
    renderWithIntl(<PermissionsStep onContinue={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /allow all/i }))
    await waitFor(() => expect(getCurrentPosition).toHaveBeenCalled())
    expect(screen.queryByRole('button', { name: /continue/i })).not.toBeInTheDocument()
  })

  it('Not now advances without granting', async () => {
    const onContinue = vi.fn()
    const user = userEvent.setup()
    renderWithIntl(<PermissionsStep onContinue={onContinue} />)
    await user.click(screen.getByRole('button', { name: /not now/i }))
    expect(onContinue).toHaveBeenCalledTimes(1)
    expect(requestPermissionAndToken).not.toHaveBeenCalled()
  })
})
