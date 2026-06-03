import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from '../button'

describe('Button', () => {
  it('renders its label', () => {
    render(<Button>Send OTP</Button>)
    expect(screen.getByRole('button', { name: 'Send OTP' })).toBeInTheDocument()
  })

  it('applies the outline variant classes', () => {
    render(<Button variant="outline">Cancel</Button>)
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveClass('border')
  })
})
