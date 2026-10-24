import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithIntl } from '@/test/intl'

vi.mock('../../hooks/usePushPreferences', () => ({ usePushPreferences: vi.fn() }))
const enable = vi.fn()
const locate = vi.fn().mockResolvedValue({ id: 'c9', canonicalName: 'Mohali' })
vi.mock('../../hooks/useEnableAlerts', () => ({ useEnableAlerts: () => ({ enable, isEnabling: false }) }))
vi.mock('../../hooks/useNearestCity', () => ({ useNearestCity: () => ({ locate, isLocating: false, errorKey: null }) }))
import { usePushPreferences } from '../../hooks/usePushPreferences'
import { NotificationSettings } from '../NotificationSettings'

const PREFS = { notificationCities: [], cities: [], geoCity: null, notifyGeoCityId: null, notifyBotRides: true, notifyPostedRides: true }
const stub = (prefs = {}, over = {}) => ({ prefs: { ...PREFS, ...prefs }, isLoading: false, isError: false, update: vi.fn(), ...over })
const master = () => screen.getByRole('switch', { name: 'Ride alerts' })
const geo = () => screen.getByRole('switch', { name: 'Alerts for my location' })

beforeEach(() => { vi.clearAllMocks(); global.Notification = { permission: 'granted' } })
afterEach(() => { delete global.Notification })

describe('NotificationSettings', () => {
  it('only offers the master + geo toggles (no city list, no per-source toggles)', () => {
    usePushPreferences.mockReturnValue(stub())
    renderWithIntl(<NotificationSettings />)
    expect(screen.getAllByRole('switch')).toHaveLength(2)
    expect(master()).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText(/Every new ride/)).toBeInTheDocument() // no filter = all rides
  })

  it('describes the feed-filter cities when a filter is set', () => {
    usePushPreferences.mockReturnValue(stub({ cities: [{ id: 'p1', name: 'Patiala' }] }))
    renderWithIntl(<NotificationSettings />)
    expect(screen.getByText('Rides from your feed filter: Patiala')).toBeInTheDocument()
  })

  it('master off clears both source toggles server-side', () => {
    const s = stub()
    usePushPreferences.mockReturnValue(s)
    renderWithIntl(<NotificationSettings />)
    fireEvent.click(master())
    expect(s.update).toHaveBeenCalledWith({ notifyBotRides: false, notifyPostedRides: false })
  })

  it('master on runs the permission flow, then turns both sources on', async () => {
    global.Notification = { permission: 'default' }
    enable.mockResolvedValue({ permission: 'granted' })
    const s = stub({ notifyBotRides: false, notifyPostedRides: false })
    usePushPreferences.mockReturnValue(s)
    renderWithIntl(<NotificationSettings />)
    fireEvent.click(master())
    await vi.waitFor(() => expect(s.update).toHaveBeenCalledWith({ notifyBotRides: true, notifyPostedRides: true }))
  })

  it('geo on saves the nearest city; geo off clears it', async () => {
    const s = stub()
    usePushPreferences.mockReturnValue(s)
    const { unmount } = renderWithIntl(<NotificationSettings />)
    fireEvent.click(geo())
    await vi.waitFor(() => expect(s.update).toHaveBeenCalledWith({ notifyGeoCityId: 'c9' }))
    unmount()
    const on = stub({ notifyGeoCityId: 'c9', geoCity: { id: 'c9', name: 'Mohali' } })
    usePushPreferences.mockReturnValue(on)
    renderWithIntl(<NotificationSettings />)
    expect(screen.getByText('Rides from your current city only.')).toBeInTheDocument()
    fireEvent.click(geo())
    expect(on.update).toHaveBeenCalledWith({ notifyGeoCityId: null })
  })

  it('geo toggle is disabled while alerts are off', () => {
    usePushPreferences.mockReturnValue(stub({ notifyBotRides: false, notifyPostedRides: false }))
    renderWithIntl(<NotificationSettings />)
    expect(geo()).toBeDisabled()
  })

  it('shows the floating-button toggle only inside the v10+ Play app', () => {
    usePushPreferences.mockReturnValue(stub())
    const { unmount } = renderWithIntl(<NotificationSettings />)
    expect(screen.queryByRole('switch', { name: 'Display over other apps button' })).toBeNull()
    unmount()
    sessionStorage.setItem('ec_bubble', '1')
    renderWithIntl(<NotificationSettings />)
    expect(screen.getByRole('switch', { name: 'Display over other apps button' })).toHaveAttribute('aria-checked', 'false')
    sessionStorage.clear()
  })
})
