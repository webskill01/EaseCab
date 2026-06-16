import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import OfflinePage from '../offline/page'

describe('OfflinePage', () => {
  it('renders the offline brand screen', () => {
    render(<OfflinePage />)
    expect(screen.getByRole('heading')).toHaveTextContent(/offline/i)
  })
})
