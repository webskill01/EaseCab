import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { UserReportCard } from '../UserReportCard'

const item = {
  user: { id: 'u1', name: 'Gurpreet', baseCity: 'Ludhiana', vehicleType: 'Innova', flagged: true },
  reportCount: 2,
  reports: [
    { id: 'rep1', reason: 'spam', remarks: 'junk', screenshotUrl: null, createdAt: new Date().toISOString(), reporter: { id: 'a', name: 'A', phoneMasked: '••••3210' } },
    { id: 'rep2', reason: 'fake', remarks: null, screenshotUrl: null, createdAt: new Date().toISOString(), reporter: { id: 'b', name: null, phoneMasked: '••••3334' } },
  ],
}

describe('UserReportCard', () => {
  it('shows the user, hidden badge, report count and reasons', () => {
    render(<UserReportCard item={item} onAction={() => {}} />)
    expect(screen.getByText('Gurpreet')).toBeTruthy()
    expect(screen.getByText('Hidden')).toBeTruthy()
    expect(screen.getByText('2 reports')).toBeTruthy()
    expect(screen.getByText('Spam')).toBeTruthy()
    expect(screen.getByText(/••••3210/)).toBeTruthy()
  })

  it('fires onAction with reinstate and uphold by userId', () => {
    const onAction = vi.fn()
    render(<UserReportCard item={item} onAction={onAction} />)
    fireEvent.click(screen.getByRole('button', { name: /reinstate/i }))
    fireEvent.click(screen.getByRole('button', { name: /keep hidden/i }))
    expect(onAction).toHaveBeenCalledWith('u1', 'reinstate')
    expect(onAction).toHaveBeenCalledWith('u1', 'uphold')
  })
})
