import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { UnresolvedRideRow } from '../UnresolvedRideRow'
import * as api from '../../services/unresolvedRidesApi'

const base = {
  id: 'r1',
  displayText: 'Need cab Ambala to ████',
  pickupRaw: 'amballa',
  dropRaw: 'dilli',
  vehicleType: 'Sedan',
  pickupCity: null,
  dropCity: { id: 'city-del', canonicalName: 'Delhi' },
}

beforeEach(() => vi.restoreAllMocks())

describe('UnresolvedRideRow', () => {
  it('shows the masked text and only a picker for the missing side', () => {
    render(<UnresolvedRideRow row={base} onAction={() => {}} />)
    expect(screen.getByText(/Need cab Ambala/)).toBeTruthy()
    expect(screen.getByText(/Delhi/)).toBeTruthy() // resolved drop shown, not a picker
    expect(screen.getByPlaceholderText(/search city for pickup/i)).toBeTruthy()
    expect(screen.queryByPlaceholderText(/search city for drop/i)).toBeNull()
  })

  it('hides the ride', () => {
    const onAction = vi.fn()
    render(<UnresolvedRideRow row={base} onAction={onAction} />)
    fireEvent.click(screen.getByRole('button', { name: /hide/i }))
    expect(onAction).toHaveBeenCalledWith('r1', 'hide')
  })

  it('sets the missing pickup city from the picker', async () => {
    vi.spyOn(api, 'searchAdminCities').mockResolvedValue([{ id: 'city-amb', canonicalName: 'Ambala' }])
    const onAction = vi.fn()
    render(<UnresolvedRideRow row={base} onAction={onAction} />)

    fireEvent.change(screen.getByPlaceholderText(/search city for pickup/i), { target: { value: 'amb' } })
    fireEvent.click(screen.getByRole('button', { name: /^search$/i }))
    await waitFor(() => expect(screen.getByText(/Set pickup → Ambala/)).toBeTruthy())
    fireEvent.click(screen.getByText(/Set pickup → Ambala/))

    expect(onAction).toHaveBeenCalledWith('r1', 'set_city', 'pickup', 'city-amb')
  })
})
