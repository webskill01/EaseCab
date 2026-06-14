import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CityStringRow } from '../CityStringRow'
import * as api from '../../services/cityStringsApi'

const base = {
  id: 'c1', rawText: 'amballa', occurrenceCount: 3,
  suggestedCity: { id: 'city-amb', canonicalName: 'Ambala' },
}

beforeEach(() => vi.restoreAllMocks())

describe('CityStringRow', () => {
  it('shows the raw text, occurrence count, and the suggestion', () => {
    render(<CityStringRow row={base} onAction={() => {}} />)
    expect(screen.getByText(/amballa/)).toBeTruthy()
    expect(screen.getByText(/3/)).toBeTruthy()
    expect(screen.getByText(/Ambala/)).toBeTruthy()
  })

  it('resolves with the pre-filled suggested city', () => {
    const onAction = vi.fn()
    render(<CityStringRow row={base} onAction={onAction} />)
    fireEvent.click(screen.getByRole('button', { name: /resolve/i }))
    expect(onAction).toHaveBeenCalledWith('c1', 'resolve', 'city-amb')
  })

  it('dismisses without a city', () => {
    const onAction = vi.fn()
    render(<CityStringRow row={base} onAction={onAction} />)
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(onAction).toHaveBeenCalledWith('c1', 'dismiss', undefined)
  })

  it('disables Resolve until a city is chosen when there is no suggestion', async () => {
    vi.spyOn(api, 'searchAdminCities').mockResolvedValue([{ id: 'city-x', canonicalName: 'Xanadu' }])
    const onAction = vi.fn()
    render(<CityStringRow row={{ ...base, suggestedCity: null }} onAction={onAction} />)
    const resolveBtn = screen.getByRole('button', { name: /resolve/i })
    expect(resolveBtn.disabled).toBe(true)

    fireEvent.change(screen.getByPlaceholderText(/search city/i), { target: { value: 'xan' } })
    fireEvent.click(screen.getByRole('button', { name: /search/i }))
    await waitFor(() => expect(screen.getByText('Xanadu')).toBeTruthy())
    fireEvent.click(screen.getByText('Xanadu'))

    expect(screen.getByRole('button', { name: /resolve/i }).disabled).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: /resolve/i }))
    expect(onAction).toHaveBeenCalledWith('c1', 'resolve', 'city-x')
  })
})
