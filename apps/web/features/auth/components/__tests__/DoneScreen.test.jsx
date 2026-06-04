import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithIntl } from '@/test/intl'
import { DoneScreen } from '../DoneScreen'

describe('DoneScreen', () => {
  it('shows the trial confirmation and enters the app', async () => {
    const onEnter = vi.fn()
    const user = userEvent.setup()
    renderWithIntl(<DoneScreen onEnter={onEnter} />)
    expect(screen.getByText(/you're all set/i)).toBeInTheDocument()
    expect(screen.getByText(/7-day free trial/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /enter easecab/i }))
    expect(onEnter).toHaveBeenCalled()
  })
})
