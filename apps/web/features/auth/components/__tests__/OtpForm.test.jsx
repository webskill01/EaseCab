import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithIntl } from '@/test/intl'
import { OtpForm } from '../OtpForm'

describe('OtpForm', () => {
  it('submits the 6-digit code and supports Change', async () => {
    const onSubmit = vi.fn()
    const onChangeNumber = vi.fn()
    const user = userEvent.setup()
    renderWithIntl(
      <OtpForm phone="+919876543210" onSubmit={onSubmit} onChangeNumber={onChangeNumber} loading={false} error={null} />,
    )
    await user.type(screen.getByLabelText(/verification code/i), '123456')
    await user.click(screen.getByRole('button', { name: /verify/i }))
    expect(onSubmit).toHaveBeenCalledWith('123456')
    await user.click(screen.getByRole('button', { name: /change/i }))
    expect(onChangeNumber).toHaveBeenCalled()
  })

  it('renders a translated error', () => {
    renderWithIntl(
      <OtpForm phone="+919876543210" onSubmit={vi.fn()} onChangeNumber={vi.fn()} loading={false} error="errors.invalidOtp" />,
    )
    expect(screen.getByText(/that code is incorrect/i)).toBeInTheDocument()
  })
})
