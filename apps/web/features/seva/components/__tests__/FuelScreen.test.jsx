import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithIntl } from '@/test/intl'
import { FuelScreen } from '../FuelScreen'
import { daysSince, mapsUrl } from '../FuelStationCard'

const api = vi.hoisted(() => ({ listNearby: vi.fn(), routeStations: vi.fn(), addStation: vi.fn(), reportStation: vi.fn() }))
const cities = vi.hoisted(() => ({ searchCities: vi.fn(), allCities: vi.fn(), nearestCity: vi.fn() }))
const geo = vi.hoisted(() => ({ getCurrentPosition: vi.fn(), geoDenied: vi.fn() }))
vi.mock('../../services/fuelApi', () => api)
vi.mock('@/features/notifications/services/geoClient', () => geo)
vi.mock('@/features/rides/services/citiesApi', () => cities)
vi.mock('../FuelMap', async () => {
  const { forwardRef } = await import('react')
  return { FuelMap: forwardRef(({ stations, route }, _ref) => <div data-testid="map">{stations.length} pins{route ? ' + road' : ''}</div>) }
})
vi.mock('next/navigation', () => ({ useRouter: () => ({ back: vi.fn(), push: vi.fn() }) }))

const POS = { lat: 30.34, lng: 76.39 }
const STATION = { id: 's1', name: 'Sandhu CNG', brand: 'cgd', lat: 30.35, lng: 76.4, address: null, distanceKm: 1.2, cngConfirmedAt: new Date().toISOString() }

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  geo.getCurrentPosition.mockResolvedValue(POS)
  api.listNearby.mockResolvedValue([STATION])
})

describe('FuelScreen', () => {
  it('lists CNG pumps near the driver with distance, confirmation and a maps link', async () => {
    renderWithIntl(<FuelScreen />)
    expect(await screen.findByText('Sandhu CNG')).toBeInTheDocument()
    expect(api.listNearby).toHaveBeenCalledWith({ ...POS, fuel: 'cng' })
    expect(screen.getByText('1.2 km')).toBeInTheDocument()
    expect(screen.getByText(/CNG confirmed today/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /navigate/i })).toHaveAttribute('href', 'https://www.google.com/maps/dir/?api=1&destination=30.35,76.4')
  })

  it('switching to Diesel refetches and is remembered on this phone', async () => {
    const user = userEvent.setup()
    renderWithIntl(<FuelScreen />)
    await screen.findByText('Sandhu CNG')
    await user.click(screen.getByRole('tab', { name: 'Diesel' }))
    await waitFor(() => expect(api.listNearby).toHaveBeenCalledWith({ ...POS, fuel: 'diesel' }))
    expect(localStorage.getItem('ec_fuel')).toBe('diesel')
    expect(screen.queryByRole('button', { name: 'CNG available' })).not.toBeInTheDocument()
  })

  it('tapping a pump opens it; a report goes to the API and thanks the driver; X goes back', async () => {
    api.reportStation.mockResolvedValue({ applied: true })
    const user = userEvent.setup()
    renderWithIntl(<FuelScreen />)
    expect(await screen.findByText('1 CNG pump nearby')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Sandhu CNG/ }))
    await user.click(screen.getByRole('button', { name: 'CNG available' }))
    expect(api.reportStation).toHaveBeenCalledWith('s1', 'cng_yes')
    expect(screen.getByText(/helps other drivers/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Back to the list' }))
    expect(screen.getByRole('button', { name: /Sandhu CNG/ })).toBeInTheDocument()
  })

  it('blocked location explains how to fix it, retry asks again', async () => {
    geo.getCurrentPosition.mockRejectedValueOnce(new Error('nope'))
    geo.geoDenied.mockResolvedValue(true)
    const user = userEvent.setup()
    renderWithIntl(<FuelScreen />)
    expect(await screen.findByText(/Location is blocked/)).toBeInTheDocument()
    expect(api.listNearby).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Sandhu CNG')).toBeInTheDocument()
  })

  it('adds a missing pump at the current spot', async () => {
    api.addStation.mockResolvedValue({ id: 'n1', status: 'pending' })
    const user = userEvent.setup()
    renderWithIntl(<FuelScreen />)
    await user.click(await screen.findByRole('button', { name: /add a missing pump/i }))
    await user.type(screen.getByLabelText('Pump name'), 'Gill Fuels')
    await user.click(screen.getByRole('button', { name: 'Petrol' }))
    await user.click(screen.getByRole('button', { name: 'Add pump' }))
    expect(api.addStation).toHaveBeenCalledWith({ name: 'Gill Fuels', brand: 'other', fuels: ['cng', 'petrol'], ...POS })
    expect(await screen.findByText(/sent for review/)).toBeInTheDocument()
  })

  it('On my route: from my location to a picked city → road on the map + list with km along + navigate via the pump', async () => {
    const ROUTE = { from: { lat: 30.34, lng: 76.39 }, to: { lat: 30.73, lng: 76.78 }, points: [[30.34, 76.39], [30.73, 76.78]], distanceKm: 67.9, durationMin: 95, approx: false }
    api.routeStations.mockResolvedValue({ route: ROUTE, stations: [{ ...STATION, alongKm: 23.4, offKm: 0.4 }] })
    cities.searchCities.mockResolvedValue([{ id: 'c-chd', canonicalName: 'Chandigarh' }])
    const user = userEvent.setup()
    renderWithIntl(<FuelScreen />)
    await screen.findByText('Sandhu CNG')
    await user.click(screen.getByRole('button', { name: 'On my route' }))
    expect(screen.getByText(/Pick where you are going/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Going to (city)' }))
    await user.type(screen.getByRole('textbox'), 'Chan')
    await user.click(await screen.findByRole('button', { name: 'Chandigarh' }))
    await waitFor(() => expect(api.routeStations).toHaveBeenCalledWith({ from: POS, toCityId: 'c-chd', fuel: 'cng' }))
    expect(await screen.findByTestId('map')).toHaveTextContent('1 pins + road')
    expect(screen.getByText(/68 km · about 1.6 hrs · 1 pump on the way/)).toBeInTheDocument()

    expect(screen.getByText('at 23 km')).toBeInTheDocument()
    expect(screen.getByText('0.4 km off the road')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /navigate/i })).toHaveAttribute('href', 'https://www.google.com/maps/dir/?api=1&destination=30.73,76.78&waypoints=30.35,76.4')
  })

  it('mapsUrl: a city start adds the origin', () => {
    const route = { fromMe: false, from: { lat: 30.34, lng: 76.39 }, to: { lat: 30.73, lng: 76.78 } }
    expect(mapsUrl({ lat: 30.5, lng: 76.5 }, route)).toBe('https://www.google.com/maps/dir/?api=1&origin=30.34,76.39&destination=30.73,76.78&waypoints=30.5,76.5')
  })

  it('daysSince counts whole days', () => {
    const now = Date.parse('2026-11-20T12:00:00Z')
    expect(daysSince('2026-11-20T01:00:00Z', now)).toBe(0)
    expect(daysSince('2026-11-17T11:00:00Z', now)).toBe(3)
  })
})
