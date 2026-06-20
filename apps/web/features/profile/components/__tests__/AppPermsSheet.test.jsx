import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithIntl } from '@/test/intl'

vi.mock('@/features/notifications/services/fcmClient', () => ({
  requestPermissionAndToken: vi.fn().mockResolvedValue({ permission: 'granted', token: null }),
}))
import { requestPermissionAndToken } from '@/features/notifications/services/fcmClient'
import { AppPermsSheet } from '../AppPermsSheet'

beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.unstubAllGlobals())

describe('AppPermsSheet', () => {
  it('renders all three permission rows + Done', () => {
    renderWithIntl(<AppPermsSheet onClose={() => {}} />)
    expect(screen.getByText('Location')).toBeInTheDocument()
    expect(screen.getByText('Notifications')).toBeInTheDocument()
    expect(screen.getByText('Battery optimization')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument()
  })

  it('shows Allow for an undecided notification permission and requests on click', async () => {
    vi.stubGlobal('Notification', { permission: 'default' })
    renderWithIntl(<AppPermsSheet onClose={() => {}} />)
    const allow = await screen.findByRole('button', { name: /allow/i })
    fireEvent.click(allow)
    await waitFor(() => expect(requestPermissionAndToken).toHaveBeenCalled())
  })

  it('Done fires onClose', () => {
    const onClose = vi.fn()
    renderWithIntl(<AppPermsSheet onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /done/i }))
    expect(onClose).toHaveBeenCalled()
  })
})
