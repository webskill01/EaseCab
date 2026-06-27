import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithIntl } from '@/test/intl'

const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))
vi.mock('@/i18n/actions', () => ({ setLocale: vi.fn() }))
import { setLocale } from '@/i18n/actions'
import { LanguageMenu } from '../LanguageMenu'

beforeEach(() => vi.clearAllMocks())

describe('LanguageMenu', () => {
  it('opens and switches locale via the server action + refresh', async () => {
    setLocale.mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderWithIntl(<LanguageMenu current="en" />)
    await user.click(screen.getByRole('button', { name: /language/i }))
    // Dropdown rows are labelled by full language name (Hindi = हिन्दी).
    await user.click(screen.getByRole('menuitem', { name: 'हिन्दी' }))
    expect(setLocale).toHaveBeenCalledWith('hi')
    expect(refresh).toHaveBeenCalled()
  })
})
