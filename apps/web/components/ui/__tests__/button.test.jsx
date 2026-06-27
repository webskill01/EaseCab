import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from '../button'

describe('Button', () => {
  it('renders its label', () => {
    render(<Button>Send OTP</Button>)
    expect(screen.getByRole('button', { name: 'Send OTP' })).toBeInTheDocument()
  })

  it('defaults to the primary blue CTA with baked-in tap feedback', () => {
    render(<Button>Post duty</Button>)
    const btn = screen.getByRole('button', { name: 'Post duty' })
    expect(btn).toHaveClass('bg-ec-blue')
    expect(btn).toHaveClass('active:scale-[0.97]')
  })

  it('applies the outline variant border', () => {
    render(<Button variant="outline">Cancel</Button>)
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveClass('border-[1.5px]')
  })

  it('applies the danger variant', () => {
    render(<Button variant="danger">Delete</Button>)
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('bg-ec-danger')
  })

  it('merges a custom className (layout stays per-use)', () => {
    render(<Button className="w-full">Wide</Button>)
    expect(screen.getByRole('button', { name: 'Wide' })).toHaveClass('w-full')
  })
})
