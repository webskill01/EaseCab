import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithIntl } from '@/test/intl'
import { PermissionsStep } from '../PermissionsStep'

describe('PermissionsStep', () => {
  it('Allow all reveals Continue which advances', async () => {
    const onContinue = vi.fn()
    const user = userEvent.setup()
    renderWithIntl(<PermissionsStep onContinue={onContinue} />)

    // all four permission items render
    expect(screen.getByText(/notifications/i)).toBeInTheDocument()
    expect(screen.getByText(/background activity/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /allow all/i }))
    await user.click(screen.getByRole('button', { name: /continue/i }))
    expect(onContinue).toHaveBeenCalledTimes(1)
  })

  it('Not now advances without granting', async () => {
    const onContinue = vi.fn()
    const user = userEvent.setup()
    renderWithIntl(<PermissionsStep onContinue={onContinue} />)
    await user.click(screen.getByRole('button', { name: /not now/i }))
    expect(onContinue).toHaveBeenCalledTimes(1)
  })
})
