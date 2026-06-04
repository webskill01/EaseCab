import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithIntl } from '@/test/intl'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }) }))
vi.mock('@/i18n/actions', () => ({ setLocale: vi.fn() }))
vi.mock('@/features/auth/services/authApi', () => ({ logout: vi.fn() }))
import { TopBar } from '../TopBar'

describe('TopBar', () => {
  it('shows the brand, language switcher and logout', () => {
    renderWithIntl(<TopBar locale="en" />)
    expect(screen.getByText('EaseCab')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /language/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument()
  })
})
