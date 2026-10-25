import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PhoneLink, formatPhone } from '../PhoneLink'

describe('PhoneLink', () => {
  it('formats Indian numbers and leaves others as stored', () => {
    expect(formatPhone('+919876543210')).toBe('+91 98765 43210')
    expect(formatPhone('+14155550100')).toBe('+14155550100')
  })
  it('renders tap-to-call and a WhatsApp link', () => {
    render(<PhoneLink phone="+919876543210" />)
    expect(screen.getByText('+91 98765 43210').getAttribute('href')).toBe('tel:+919876543210')
    expect(screen.getByLabelText('WhatsApp +91 98765 43210').getAttribute('href')).toBe('https://wa.me/919876543210')
  })
  it('renders nothing without a number', () => {
    const { container } = render(<PhoneLink phone={null} />)
    expect(container.innerHTML).toBe('')
  })
})
