import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithIntl } from '@/test/intl'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
import { MyPostedCard } from '../MyPostedCard'

const VM = { id: 'p1', from: 'Mohali', to: 'Manali', vehicleType: 'Innova', fare: 4200, date: null, status: 'active', isClosed: false }

describe('MyPostedCard', () => {
  it('renders the route and fires mark-done + delete', () => {
    const onDone = vi.fn(); const onDelete = vi.fn()
    renderWithIntl(<MyPostedCard post={VM} onMarkDone={onDone} onDelete={onDelete} />)
    expect(screen.getByText('Mohali')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /mark done/i }))
    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    expect(onDone).toHaveBeenCalledWith(VM)
    expect(onDelete).toHaveBeenCalledWith(VM)
  })

  it('hides the actions for an already-done post', () => {
    renderWithIntl(<MyPostedCard post={{ ...VM, status: 'done', isClosed: true }} onMarkDone={() => {}} onDelete={() => {}} />)
    expect(screen.queryByRole('button', { name: /mark done/i })).toBeNull()
  })
})
