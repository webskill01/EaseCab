import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithIntl } from '@/test/intl'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
const submitRc = vi.fn()
let dvState = { submitRc, rcResult: null, rcErrorKey: null, rcSubmitting: false }
vi.mock('../../hooks/useDriverVerify', () => ({ useDriverVerify: () => dvState }))
vi.mock('../KycUploader', () => ({ KycUploader: () => <div>kyc-uploader</div> }))
import { RcVerify } from '../RcVerify'

const NONE = { dlSubmitted: false, rcSubmitted: false }

beforeEach(() => { vi.clearAllMocks(); dvState = { submitRc, rcResult: null, rcErrorKey: null, rcSubmitting: false } })

describe('RcVerify', () => {
  it('enables verify when an RC number is entered, then submits', () => {
    renderWithIntl(<RcVerify status={NONE} />)
    const btn = screen.getByRole('button', { name: /^verify$/i })
    expect(btn).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/rc number/i), { target: { value: 'PB10AB1234' } })
    expect(btn).toBeEnabled()
    fireEvent.click(btn)
    expect(submitRc).toHaveBeenCalledWith('PB10AB1234')
  })

  it('shows verified vehicle data + uploader + Done→/profile once submitted', () => {
    dvState = { submitRc, rcResult: { make: 'Maruti', model: 'Dzire', regNo: 'PB10AB1234' }, rcErrorKey: null, rcSubmitting: false }
    renderWithIntl(<RcVerify status={NONE} />)
    expect(screen.getByText(/maruti dzire/i)).toBeInTheDocument()
    expect(screen.getByText('kyc-uploader')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /done/i }))
    expect(push).toHaveBeenCalledWith('/profile')
  })
})
