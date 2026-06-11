import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderWithIntl } from '@/test/intl'

vi.mock('../../services/postApi', () => ({ parsePost: vi.fn() }))
import { parsePost } from '../../services/postApi'
import { PasteForm } from '../PasteForm'

function renderPaste(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return renderWithIntl(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

beforeEach(() => vi.clearAllMocks())

const GOOD = { fromCityId: null, fromCityName: null, fromCityRaw: 'Delhi', toCityId: null, toCityName: null, toCityRaw: 'Chandigarh', vehicleType: 'Innova', phone: '+919876543210' }
const EMPTY = { fromCityId: null, fromCityName: null, fromCityRaw: null, toCityId: null, toCityName: null, toCityRaw: null, vehicleType: null, phone: null }

describe('PasteForm', () => {
  it('disables Read on an empty box', () => {
    renderPaste(<PasteForm onEdit={vi.fn()} onConfirm={vi.fn()} posting={false} />)
    expect(screen.getByRole('button', { name: /read message/i })).toBeDisabled()
  })

  it('parses, previews the route, and confirms with the draft', async () => {
    parsePost.mockResolvedValue(GOOD)
    const onConfirm = vi.fn()
    const user = userEvent.setup()
    renderPaste(<PasteForm onEdit={vi.fn()} onConfirm={onConfirm} posting={false} />)
    await user.type(screen.getByLabelText(/paste the ride message/i), 'Delhi to Chandigarh Innova 9876543210')
    await user.click(screen.getByRole('button', { name: /read message/i }))
    await waitFor(() => expect(screen.getByText('Delhi')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /looks good/i }))
    expect(onConfirm).toHaveBeenCalledWith(GOOD)
  })

  it('shows the failure state + form fallback on an empty draft', async () => {
    parsePost.mockResolvedValue(EMPTY)
    const onEdit = vi.fn()
    const user = userEvent.setup()
    renderPaste(<PasteForm onEdit={onEdit} onConfirm={vi.fn()} posting={false} />)
    await user.type(screen.getByLabelText(/paste the ride message/i), 'good morning everyone')
    await user.click(screen.getByRole('button', { name: /read message/i }))
    await waitFor(() => expect(screen.getByText(/couldn't read that/i)).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /use the form/i }))
    expect(onEdit).toHaveBeenCalledWith(null)
  })
})
