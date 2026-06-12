import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithIntl } from '@/test/intl'

vi.mock('../../hooks/usePushPreferences', () => ({ usePushPreferences: vi.fn() }))
// CityPicker pulls the /cities typeahead; stub it to a button that picks a fixed city.
vi.mock('@/features/rides/components/CityPicker', () => ({
  CityPicker: ({ onPick }) => <button type="button" onClick={() => onPick({ id: 'c2', name: 'Mohali' })}>add-city</button>,
}))
import { usePushPreferences } from '../../hooks/usePushPreferences'
import { NotificationSettings } from '../NotificationSettings'

const stub = (over = {}) => ({ prefs: { notificationCities: ['c1'], cities: [{ id: 'c1', name: 'Ludhiana' }], notifyBotRides: true, notifyPostedRides: false }, isLoading: false, isError: false, update: vi.fn(), ...over })

beforeEach(() => vi.clearAllMocks())

describe('NotificationSettings', () => {
  it('renders both toggles reflecting prefs', () => {
    usePushPreferences.mockReturnValue(stub())
    renderWithIntl(<NotificationSettings />)
    expect(screen.getByRole('switch', { name: 'Bot-feed ride alerts' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('switch', { name: 'Verified ride alerts' })).toHaveAttribute('aria-checked', 'false')
  })

  it('flips a toggle via update', () => {
    const update = vi.fn()
    usePushPreferences.mockReturnValue(stub({ update }))
    renderWithIntl(<NotificationSettings />)
    fireEvent.click(screen.getByRole('switch', { name: 'Verified ride alerts' }))
    expect(update).toHaveBeenCalledWith({ notifyPostedRides: true })
  })

  it('removes an alert city via update with the filtered ids', () => {
    const update = vi.fn()
    usePushPreferences.mockReturnValue(stub({ update }))
    renderWithIntl(<NotificationSettings />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove Ludhiana' }))
    expect(update).toHaveBeenCalledWith({ notificationCities: [] })
  })

  it('adds a city via the picker, appending its id', () => {
    const update = vi.fn()
    usePushPreferences.mockReturnValue(stub({ update }))
    renderWithIntl(<NotificationSettings />)
    fireEvent.click(screen.getByText('add-city'))
    expect(update).toHaveBeenCalledWith({ notificationCities: ['c1', 'c2'] })
  })
})
