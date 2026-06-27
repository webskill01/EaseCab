import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { VerificationCard } from '../VerificationCard'

const user = { id: 'u1', name: 'A B', phoneMasked: '••••3210', carMake: 'Maruti', carModel: 'Dzire', carRegNo: 'PB01', verificationStatus: 'submitted' }
const dl = { id: 's1', docType: 'dl', verifiedName: 'STUB DL', user, images: { dp: null, licence: 'https://signed/lic', rc: null, carFront: null, carBack: null } }
const rc = { id: 's2', docType: 'rc', verifiedName: 'STUB RC', user, images: { dp: null, licence: null, rc: 'https://signed/rc', carFront: null, carBack: null } }

describe('VerificationCard', () => {
  it('renders the person once, masked phone, and fires approve with the submission id', () => {
    const onApprove = vi.fn()
    render(<VerificationCard group={{ user, submissions: [dl] }} onApprove={onApprove} onReject={() => {}} onBadge={() => {}} />)
    expect(screen.getByText('dl')).toBeTruthy()
    expect(screen.getByText('••••3210')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /approve/i }))
    expect(onApprove).toHaveBeenCalledWith('s1')
  })

  it('groups multiple documents of one person into a single card with per-doc actions', () => {
    render(<VerificationCard group={{ user, submissions: [dl, rc] }} onApprove={() => {}} onReject={() => {}} onBadge={() => {}} />)
    // One shared identity, two doc blocks.
    expect(screen.getAllByText('••••3210')).toHaveLength(1)
    expect(screen.getByText('dl')).toBeTruthy()
    expect(screen.getByText('rc')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /approve/i })).toHaveLength(2)
  })

  it('shows present images as links and absent ones as "none"', () => {
    render(<VerificationCard group={{ user, submissions: [dl] }} onApprove={() => {}} onReject={() => {}} onBadge={() => {}} />)
    expect(screen.getByRole('link', { name: /licence/i })).toHaveProperty('href', 'https://signed/lic')
    expect(screen.getByText(/rc: none/i)).toBeTruthy()
  })

  it('reject hands the submission back to the parent', () => {
    const onReject = vi.fn()
    render(<VerificationCard group={{ user, submissions: [dl] }} onApprove={() => {}} onReject={onReject} onBadge={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /reject/i }))
    expect(onReject).toHaveBeenCalledWith(dl)
  })
})
