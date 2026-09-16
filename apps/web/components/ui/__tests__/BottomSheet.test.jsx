import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BottomSheet } from '../BottomSheet'

describe('BottomSheet centered', () => {
  it('closes when the blank area outside the card is tapped, not the card itself', () => {
    const onClose = vi.fn()
    const { container } = render(<BottomSheet centered onClose={onClose} label="Dialog"><p>body</p></BottomSheet>)
    fireEvent.click(screen.getByText('body'))
    fireEvent.animationEnd(screen.getByRole('dialog'))
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.click(container.querySelector('[aria-hidden="true"]')) // scrim
    fireEvent.animationEnd(screen.getByRole('dialog'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
