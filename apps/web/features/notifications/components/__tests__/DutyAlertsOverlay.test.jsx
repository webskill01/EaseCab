import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithIntl } from '@/test/intl'

vi.mock('../../hooks/usePushPreferences', () => ({ usePushPreferences: vi.fn() }))
const enable = vi.fn().mockResolvedValue({ permission: 'granted', city: null })
const disable = vi.fn().mockResolvedValue(undefined)
vi.mock('../../hooks/useEnableAlerts', () => ({ useEnableAlerts: () => ({ enable, disable, isEnabling: false }) }))
vi.mock('../../lib/pushFlow', () => ({ permissionState: vi.fn(() => 'default') }))
vi.mock('../../lib/pushStorage', () => ({ getStoredToken: () => null }))
vi.mock('@/features/rides/components/CityPicker', () => ({
  CityPicker: ({ onPick }) => <button type="button" onClick={() => onPick({ id: 'c2', name: 'Mohali' })}>add-city</button>,
}))
import { usePushPreferences } from '../../hooks/usePushPreferences'
import { permissionState } from '../../lib/pushFlow'
import { DutyAlertsOverlay } from '../DutyAlertsOverlay'

const stub = (over = {}) => ({
  prefs: { notificationCities: ['c1'], cities: [{ id: 'c1', name: 'Ludhiana' }], notifyBotRides: true, notifyPostedRides: false },
  isLoading: false, isError: false, update: vi.fn(), saving: false, ...over,
})

beforeEach(() => { vi.clearAllMocks(); permissionState.mockReturnValue('default'); usePushPreferences.mockReturnValue(stub()) })

describe('DutyAlertsOverlay', () => {
  it('seeds the city slots from saved preferences', async () => {
    renderWithIntl(<DutyAlertsOverlay onClose={vi.fn()} />)
    expect(await screen.findByText('Ludhiana')).toBeInTheDocument()
  })

  it('seeds the master toggle ON when OS permission is already granted (token optional — F1)', async () => {
    // No stored token (e.g. demo without a VAPID key) must NOT force the toggle off:
    // app-side "alerts on" = OS permission granted; the push token is a delivery bonus.
    permissionState.mockReturnValue('granted')
    renderWithIntl(<DutyAlertsOverlay onClose={vi.fn()} />)
    const toggle = await screen.findByRole('switch', { name: /duty notifications/i })
    expect(toggle).toHaveAttribute('aria-checked', 'true')
  })

  it('turns alerts on via the master toggle (drives the enable flow)', async () => {
    const user = userEvent.setup()
    renderWithIntl(<DutyAlertsOverlay onClose={vi.fn()} />)
    const toggle = await screen.findByRole('switch', { name: /duty notifications/i })
    expect(toggle).toHaveAttribute('aria-checked', 'false')
    await user.click(toggle)
    expect(enable).toHaveBeenCalled()
    expect(toggle).toHaveAttribute('aria-checked', 'true')
  })

  it('adds a city via the picker and Save persists the merged id list', async () => {
    const update = vi.fn()
    usePushPreferences.mockReturnValue(stub({ update }))
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderWithIntl(<DutyAlertsOverlay onClose={onClose} />)
    await user.click(await screen.findByText('add-city'))
    await user.click(screen.getByRole('button', { name: /save preferences/i }))
    expect(update).toHaveBeenCalledWith({ notificationCities: ['c1', 'c2'] }, expect.objectContaining({ onSuccess: onClose }))
  })

  it('removes a slot, then Save persists the empty list', async () => {
    const update = vi.fn()
    usePushPreferences.mockReturnValue(stub({ update }))
    const user = userEvent.setup()
    renderWithIntl(<DutyAlertsOverlay onClose={vi.fn()} />)
    await user.click(await screen.findByRole('button', { name: /remove ludhiana/i }))
    await user.click(screen.getByRole('button', { name: /save preferences/i }))
    expect(update).toHaveBeenCalledWith({ notificationCities: [] }, expect.anything())
  })

  it('shows the blocked hint when OS permission is already denied (10.1-b)', async () => {
    // Denied can't be re-prompted, so the toggle can never flip on — the user needs to
    // be told where to fix it instead of the toggle silently staying off.
    permissionState.mockReturnValue('denied')
    renderWithIntl(<DutyAlertsOverlay onClose={vi.fn()} />)
    expect(await screen.findByRole('alert')).toHaveTextContent(/blocked/i)
    expect(screen.getByRole('switch', { name: /duty notifications/i })).toHaveAttribute('aria-checked', 'false')
  })

  it('surfaces the blocked hint after a denied enable attempt (10.1-b)', async () => {
    enable.mockResolvedValueOnce({ permission: 'denied', city: null })
    const user = userEvent.setup()
    renderWithIntl(<DutyAlertsOverlay onClose={vi.fn()} />)
    const toggle = await screen.findByRole('switch', { name: /duty notifications/i })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await user.click(toggle)
    expect(enable).toHaveBeenCalled()
    expect(toggle).toHaveAttribute('aria-checked', 'false')
    expect(await screen.findByRole('alert')).toHaveTextContent(/blocked/i)
  })

  it('Clear all empties every slot', async () => {
    const update = vi.fn()
    usePushPreferences.mockReturnValue(stub({ update }))
    const user = userEvent.setup()
    renderWithIntl(<DutyAlertsOverlay onClose={vi.fn()} />)
    await user.click(await screen.findByRole('button', { name: /clear all/i }))
    expect(screen.queryByText('Ludhiana')).not.toBeInTheDocument()
  })
})
