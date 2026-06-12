import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithIntl } from '@/test/intl'
vi.mock('../../hooks/useDriverVerify', () => ({ useDriverVerify: vi.fn() }))
import { useDriverVerify } from '../../hooks/useDriverVerify'
import { DriverVerify } from '../DriverVerify'

describe('DriverVerify', () => {
  it('submits DL number + dob', () => {
    const submitDl = vi.fn()
    useDriverVerify.mockReturnValue({ submitDl, submitRc: vi.fn(), dlResult: null, rcResult: null, dlErrorKey: null, rcErrorKey: null, dlSubmitting: false, rcSubmitting: false })
    renderWithIntl(<DriverVerify status={{ dlSubmitted: false, rcSubmitted: false }} />)
    fireEvent.change(screen.getByLabelText(/dl number/i), { target: { value: 'PB1020200012345' } })
    fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '1990-05-20' } })
    fireEvent.click(screen.getAllByRole('button', { name: /^verify$/i })[0])
    expect(submitDl).toHaveBeenCalledWith({ dlNumber: 'PB1020200012345', dob: '1990-05-20' })
  })
  it('shows the DL result when present', () => {
    useDriverVerify.mockReturnValue({ submitDl: vi.fn(), submitRc: vi.fn(), dlResult: { validUpto: '2030-01-01', cov: 'LMV' }, rcResult: null, dlErrorKey: null, rcErrorKey: null, dlSubmitting: false, rcSubmitting: false })
    renderWithIntl(<DriverVerify status={{ dlSubmitted: true, rcSubmitted: false }} />)
    expect(screen.getByText(/LMV/)).toBeInTheDocument()
  })
})
