import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ReportCard } from '../ReportCard'

const item = {
  id: 'r1', reason: 'spam', remarks: 'junk', screenshotUrl: null, createdAt: new Date().toISOString(),
  reporter: { id: 'u1', name: 'Reporter', phone: '+919876543210' },
  target: { kind: 'bot', id: 'ride1', status: 'fresh', displayText: 'A to B', fromCity: 'Amritsar', toCity: 'Delhi', posterName: null },
}

describe('ReportCard', () => {
  it('shows the reason, masked reporter phone, and target route', () => {
    render(<ReportCard item={item} onAction={() => {}} />)
    expect(screen.getByText('Spam')).toBeTruthy()
    expect(screen.getByText('+91 98765 43210')).toBeTruthy()
    expect(screen.getByText(/Amritsar/)).toBeTruthy()
    expect(screen.getByText(/Delhi/)).toBeTruthy()
  })

  it('fires onAction with dismiss and remove', () => {
    const onAction = vi.fn()
    render(<ReportCard item={item} onAction={onAction} />)
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    fireEvent.click(screen.getByRole('button', { name: /remove/i }))
    expect(onAction).toHaveBeenCalledWith('r1', 'dismiss')
    expect(onAction).toHaveBeenCalledWith('r1', 'remove')
  })

  it('shows when the ride was posted', () => {
    render(<ReportCard item={{ ...item, target: { ...item.target, postedAt: '2026-10-25T06:00:00Z' } }} onAction={() => {}} />)
    expect(screen.getByText(/Posted 25 Oct 2026, 11:30/)).toBeTruthy()
  })

  it('a resolved report shows its verdict and no action buttons', () => {
    render(<ReportCard item={{ ...item, reviewedAt: '2026-10-25T06:00:00Z', reviewAction: 'remove' }} onAction={() => {}} />)
    expect(screen.getByText('Ride removed')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /dismiss/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /remove ride/i })).toBeNull()
  })
})
