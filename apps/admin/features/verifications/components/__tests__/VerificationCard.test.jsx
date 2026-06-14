import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { VerificationCard } from '../VerificationCard'

const item = {
  id: 's1', docType: 'dl', verifiedName: 'A B',
  user: { id: 'u1', name: 'A B', phoneMasked: '••••3210', carMake: 'Maruti', carModel: 'Dzire', carRegNo: 'PB01', verificationStatus: 'submitted' },
  images: { dp: null, licence: 'https://signed/lic', rc: null, carFront: null, carBack: null },
}

describe('VerificationCard', () => {
  it('renders doc type + masked phone and fires approve', () => {
    const onApprove = vi.fn()
    render(<VerificationCard item={item} onApprove={onApprove} onReject={() => {}} onBadge={() => {}} />)
    expect(screen.getByText('dl')).toBeTruthy()
    expect(screen.getByText('••••3210')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /approve/i }))
    expect(onApprove).toHaveBeenCalledWith('s1')
  })

  it('shows present images as links and absent ones as "none"', () => {
    render(<VerificationCard item={item} onApprove={() => {}} onReject={() => {}} onBadge={() => {}} />)
    expect(screen.getByRole('link', { name: /licence/i })).toHaveProperty('href', 'https://signed/lic')
    expect(screen.getByText(/rc: none/i)).toBeTruthy()
  })

  it('reject hands the whole item back to the parent', () => {
    const onReject = vi.fn()
    render(<VerificationCard item={item} onApprove={() => {}} onReject={onReject} onBadge={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /reject/i }))
    expect(onReject).toHaveBeenCalledWith(item)
  })
})
