import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithIntl } from '@/test/intl'
import { VerifyGateSheet } from '../VerifyGateSheet'

describe('VerifyGateSheet', () => {
  it('renders the gate and fires onVerify from the CTA', () => {
    const onVerify = vi.fn()
    renderWithIntl(<VerifyGateSheet onClose={vi.fn()} onVerify={onVerify} />)
    expect(screen.getByText(/get verified to post/i)).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /verify now/i }))
    expect(onVerify).toHaveBeenCalled()
  })
})
