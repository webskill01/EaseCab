import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Avatar } from '../Avatar'

describe('Avatar', () => {
  it('links a photo to its full-size URL in a new tab', () => {
    render(<Avatar name="Gurpreet Singh" src="https://cdn.example/dp.jpg" />)
    const a = screen.getByLabelText("Open Gurpreet Singh's photo")
    expect(a.getAttribute('href')).toBe('https://cdn.example/dp.jpg')
    expect(a.getAttribute('target')).toBe('_blank')
  })
  it('is a plain initials bubble without a photo', () => {
    const { container } = render(<Avatar name="Gurpreet Singh" />)
    expect(container.querySelector('a')).toBeNull()
    expect(container.textContent).toBe('GS')
  })
})
