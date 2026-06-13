import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithIntl } from '@/test/intl'
import { NotificationPrePrompt } from '../NotificationPrePrompt'

it('fires onEnable and onDismiss', () => {
  const onEnable = vi.fn(); const onDismiss = vi.fn()
  renderWithIntl(<NotificationPrePrompt onEnable={onEnable} onDismiss={onDismiss} enabling={false} />)
  fireEvent.click(screen.getByRole('button', { name: /enable alerts/i }))
  expect(onEnable).toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: /not now/i }))
  expect(onDismiss).toHaveBeenCalled()
})

it('disables the CTA while enabling', () => {
  renderWithIntl(<NotificationPrePrompt onEnable={() => {}} onDismiss={() => {}} enabling />)
  expect(screen.getByRole('button', { name: /enable alerts/i })).toBeDisabled()
})
