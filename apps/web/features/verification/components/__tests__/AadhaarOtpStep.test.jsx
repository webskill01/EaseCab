import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithIntl } from '@/test/intl'
import { AadhaarOtpStep } from '../AadhaarOtpStep'

describe('AadhaarOtpStep', () => {
  it('submits a 6-digit code', () => {
    const onSubmit = vi.fn()
    renderWithIntl(<AadhaarOtpStep onSubmit={onSubmit} onResend={vi.fn()} onBack={vi.fn()} loading={false} errorKey={null} />)
    fireEvent.change(screen.getByLabelText(/enter the otp/i), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: /^verify$/i }))
    expect(onSubmit).toHaveBeenCalledWith('123456')
  })
})
