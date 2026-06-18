import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithIntl } from '@/test/intl'

vi.mock('../../hooks/usePushPreferences', () => ({ usePushPreferences: vi.fn() }))
const enable = vi.fn().mockResolvedValue({ permission: 'granted', city: null })
const disable = vi.fn().mockResolvedValue(undefined)
vi.mock('../../hooks/useEnableAlerts', () => ({ useEnableAlerts: () => ({ enable, disable, isEnabling: false }) }))
vi.mock('../../lib/pushFlow', () => ({ permissionState: () => 'default' }))
vi.mock('../../lib/pushStorage', () => ({ getStoredToken: () => null }))
vi.mock('@/features/rides/components/CityPicker', () => ({
  CityPicker: ({ onPick }) => <button type="button" onClick={() => onPick({ id: 'c2', name: 'Mohali' })}>add-city</button>,
}))
import { usePushPreferences } from '../../hooks/usePushPreferences'
import { DutyAlertsOverlay } from '../DutyAlertsOverlay'

const stub = (over = {}) => ({
  prefs: { notificationCities: ['c1'], cities: [{ id: 'c1', name: 'Ludhiana' }], notifyBotRides: true, notifyPostedRides: false },
  isLoading: false, isError: false, update: vi.fn(), saving: false, ...over,
})

beforeEach(() => { vi.clearAllMocks(); usePushPreferences.mockReturnValue(stub()) })

describe('DutyAlertsOverlay', () => {
  it('seeds the city slots from saved preferences', async () => {
    renderWithIntl(<DutyAlertsOverlay onClose={vi.fn()} />)
    expect(await screen.findByText('Ludhiana')).toBeInTheDocument()
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

  it('Clear all empties every slot', async () => {
    const update = vi.fn()
    usePushPreferences.mockReturnValue(stub({ update }))
    const user = userEvent.setup()
    renderWithIntl(<DutyAlertsOverlay onClose={vi.fn()} />)
    await user.click(await screen.findByRole('button', { name: /clear all/i }))
    expect(screen.queryByText('Ludhiana')).not.toBeInTheDocument()
  })
})
