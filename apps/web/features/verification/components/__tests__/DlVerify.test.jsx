import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithIntl } from '@/test/intl'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
const submitDl = vi.fn()
let dvState = { submitDl, dlResult: null, dlErrorKey: null, dlSubmitting: false }
vi.mock('../../hooks/useDriverVerify', () => ({ useDriverVerify: () => dvState }))
vi.mock('../KycUploader', () => ({ KycUploader: () => <div>kyc-uploader</div> }))
import { DlVerify } from '../DlVerify'

const NONE = { dlSubmitted: false, rcSubmitted: false }

beforeEach(() => { vi.clearAllMocks(); dvState = { submitDl, dlResult: null, dlErrorKey: null, dlSubmitting: false } })

describe('DlVerify', () => {
  it('disables verify until DL number + DOB are set, then submits', () => {
    renderWithIntl(<DlVerify status={NONE} />)
    const btn = screen.getByRole('button', { name: /^verify$/i })
    expect(btn).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/dl number/i), { target: { value: 'PB1020201234' } })
    fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '1990-01-01' } })
    expect(btn).toBeEnabled()
    fireEvent.click(btn)
    expect(submitDl).toHaveBeenCalledWith({ dlNumber: 'PB1020201234', dob: '1990-01-01' })
  })

  it('shows verified data + the image uploader + Done→/profile once submitted', () => {
    dvState = { submitDl, dlResult: { validUpto: '2031-01-01', cov: 'LMV' }, dlErrorKey: null, dlSubmitting: false }
    renderWithIntl(<DlVerify status={NONE} />)
    expect(screen.getByText(/valid up to 2031-01-01/i)).toBeInTheDocument()
    expect(screen.getByText('kyc-uploader')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /done/i }))
    expect(push).toHaveBeenCalledWith('/profile')
  })
})
