import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithIntl } from '@/test/intl'

// Stub the notification block (its own test covers it) + auth logout import.
vi.mock('@/features/notifications/components/NotificationSettings', () => ({ NotificationSettings: () => <div data-testid="notif" /> }))
vi.mock('@/features/auth/services/authApi', () => ({ logout: vi.fn() }))
vi.mock('@/i18n/actions', () => ({ setLocale: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }) }))

import { SettingsScreen } from '../SettingsScreen'

describe('SettingsScreen', () => {
  it('renders the notification block, language, support and logout', () => {
    renderWithIntl(<SettingsScreen />)
    expect(screen.getByTestId('notif')).toBeInTheDocument()
    expect(screen.getByText('Language')).toBeInTheDocument()
    expect(screen.getByText('Support')).toBeInTheDocument()
    expect(screen.getByText('Log out')).toBeInTheDocument()
  })
})
