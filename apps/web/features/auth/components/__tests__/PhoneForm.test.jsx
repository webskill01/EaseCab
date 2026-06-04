import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithIntl } from '@/test/intl'
import { PhoneForm } from '../PhoneForm'

describe('PhoneForm', () => {
  it('enables Continue only at 10 digits and submits them', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    renderWithIntl(<PhoneForm onSubmit={onSubmit} loading={false} error={null} />)
    const button = screen.getByRole('button', { name: /continue/i })
    expect(button).toBeDisabled()
    await user.type(screen.getByLabelText(/phone number/i), '9876543210')
    expect(button).toBeEnabled()
    await user.click(button)
    expect(onSubmit).toHaveBeenCalledWith('9876543210')
  })

  it('renders a translated error', () => {
    renderWithIntl(<PhoneForm onSubmit={vi.fn()} loading={false} error="errors.rateLimited" />)
    expect(screen.getByText(/too many attempts/i)).toBeInTheDocument()
  })
})
