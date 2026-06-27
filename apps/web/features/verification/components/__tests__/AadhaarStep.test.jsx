import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithIntl } from '@/test/intl'
import { AadhaarStep } from '../AadhaarStep'

vi.mock('next/navigation', () => ({ useRouter: () => ({ back: vi.fn(), push: vi.fn() }) }))

describe('AadhaarStep', () => {
  it('enables Continue only at 12 digits and submits', () => {
    const onSubmit = vi.fn()
    renderWithIntl(<AadhaarStep onSubmit={onSubmit} loading={false} errorKey={null} />)
    const input = screen.getByLabelText(/aadhaar number/i)
    fireEvent.change(input, { target: { value: '12345' } })
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled()
    fireEvent.change(input, { target: { value: '123456789012' } })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(onSubmit).toHaveBeenCalledWith('123456789012')
  })
})
