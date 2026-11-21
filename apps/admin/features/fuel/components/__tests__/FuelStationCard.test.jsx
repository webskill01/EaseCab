import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FuelStationCard } from '../FuelStationCard'

const base = { id: 's1', name: 'Sandhu CNG', brand: 'cgd', source: 'driver', lat: 30.3398, lng: 76.3869, address: null, hasCng: true, hasPetrol: true, hasDiesel: false, createdAt: '2026-11-20T06:00:00Z', addedBy: { id: 'u1', name: 'Gurpreet' } }

describe('FuelStationCard', () => {
  it('pending pump: details, map link, approve / reject', () => {
    const onDecide = vi.fn()
    render(<FuelStationCard station={{ ...base, status: 'pending' }} onDecide={onDecide} />)
    expect(screen.getByText('CNG · Petrol')).toBeTruthy()
    expect(screen.getByText('Gurpreet')).toBeTruthy()
    expect(screen.getByRole('link', { name: /30.33980, 76.38690/ }).getAttribute('href')).toBe('https://www.google.com/maps/search/?api=1&query=30.3398,76.3869')
    fireEvent.click(screen.getByRole('button', { name: /approve/i }))
    fireEvent.click(screen.getByRole('button', { name: /reject/i }))
    expect(onDecide.mock.calls).toEqual([['s1', { status: 'active' }], ['s1', { status: 'rejected' }]])
    expect(screen.queryByRole('button', { name: /dismiss/i })).toBeNull()
  })

  it('reported pump: shows reports and the four actions', () => {
    const onDecide = vi.fn()
    const reports = [{ kind: 'cng_no', createdAt: '2026-11-19T06:00:00Z', user: { id: 'u2', name: 'Harjit' } }]
    render(<FuelStationCard station={{ ...base, status: 'active', source: 'hpcl', addedBy: null, reports }} onDecide={onDecide} />)
    expect(screen.getByText('No CNG')).toBeTruthy()
    expect(screen.getByText('Harjit')).toBeTruthy()
    for (const name of [/cng on/i, /cng off/i, /mark closed/i, /dismiss/i]) fireEvent.click(screen.getByRole('button', { name }))
    expect(onDecide.mock.calls.map((c) => c[1])).toEqual([{ hasCng: true }, { hasCng: false }, { status: 'closed' }, {}])
  })
})
