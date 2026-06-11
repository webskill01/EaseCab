import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { VehicleChips } from '../VehicleChips'

describe('VehicleChips', () => {
  it('renders all vehicle chips and fires onChange with the label', () => {
    const onChange = vi.fn()
    render(<VehicleChips value="" onChange={onChange} />)
    expect(screen.getByRole('radio', { name: /innova/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: /^sedan$/i }))
    expect(onChange).toHaveBeenCalledWith('Sedan')
  })

  it('marks the selected chip aria-checked', () => {
    render(<VehicleChips value="Innova" onChange={() => {}} />)
    expect(screen.getByRole('radio', { name: /innova/i })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: /^sedan$/i })).toHaveAttribute('aria-checked', 'false')
  })
})
