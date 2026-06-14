import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { UserCard } from '../UserCard'

const base = {
  id: 'u1', name: 'Gurpreet', phoneMasked: '••••3210', aadhaarVerified: true,
  verificationStatus: 'approved', baseCity: 'Amritsar', vehicleType: 'sedan',
  createdAt: new Date().toISOString(), isDeleted: false, deletedAt: null,
  subscription: { status: 'trial', validUntil: new Date('2026-07-01').toISOString() },
}

describe('UserCard', () => {
  it('shows the name, masked phone, and city', () => {
    render(<UserCard user={base} onAction={() => {}} />)
    expect(screen.getByText('Gurpreet')).toBeTruthy()
    expect(screen.getByText('••••3210')).toBeTruthy()
    expect(screen.getByText(/Amritsar/)).toBeTruthy()
  })

  it('an active user shows Delete and fires onAction(delete)', () => {
    const onAction = vi.fn()
    render(<UserCard user={base} onAction={onAction} />)
    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    expect(onAction).toHaveBeenCalledWith('u1', 'delete')
  })

  it('a deleted user shows Restore and fires onAction(restore)', () => {
    const onAction = vi.fn()
    render(<UserCard user={{ ...base, isDeleted: true }} onAction={onAction} />)
    fireEvent.click(screen.getByRole('button', { name: /restore/i }))
    expect(onAction).toHaveBeenCalledWith('u1', 'restore')
  })
})
