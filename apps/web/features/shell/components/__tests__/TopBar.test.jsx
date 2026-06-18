import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithIntl } from '@/test/intl'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }) }))
vi.mock('@/i18n/actions', () => ({ setLocale: vi.fn() }))
import { TopBar } from '../TopBar'

describe('TopBar', () => {
  it('shows the brand, Chats, language switcher and Support — and NO logout (logout lives on Profile)', () => {
    renderWithIntl(<TopBar locale="en" />)
    expect(screen.getByText('EaseCab')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /chats/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /language/i })).toBeInTheDocument()
    // Support is an anchor (opens WhatsApp / mailto), so it carries the link role.
    expect(screen.getByRole('link', { name: /support/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /log out/i })).not.toBeInTheDocument()
  })
})
