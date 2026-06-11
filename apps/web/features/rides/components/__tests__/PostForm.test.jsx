import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithIntl } from '@/test/intl'
import { PostForm } from '../PostForm'
import { emptyForm } from '../../lib/postForm'

const FULL = {
  from: { id: 'a', name: 'Mohali' }, to: { id: 'b', name: 'Manali' },
  vehicle: 'Innova', date: '2026-06-20', time: '09:30', phone: '9876543210', fare: '', notes: '',
}

describe('PostForm', () => {
  it('disables Post on an empty form', () => {
    renderWithIntl(<PostForm form={emptyForm()} onChange={() => {}} onSubmit={() => {}} submitting={false} />)
    expect(screen.getByRole('button', { name: /post ride/i })).toBeDisabled()
  })

  it('enables Post and fires onSubmit when the form is complete', () => {
    const onSubmit = vi.fn()
    renderWithIntl(<PostForm form={FULL} onChange={() => {}} onSubmit={onSubmit} submitting={false} />)
    const btn = screen.getByRole('button', { name: /post ride/i })
    expect(btn).toBeEnabled()
    fireEvent.click(btn)
    expect(onSubmit).toHaveBeenCalled()
  })

  it('strips non-digits from the contact field', () => {
    const onChange = vi.fn()
    renderWithIntl(<PostForm form={emptyForm()} onChange={onChange} onSubmit={() => {}} submitting={false} />)
    fireEvent.change(screen.getByLabelText(/contact number/i), { target: { value: '98a76-543210' } })
    expect(onChange).toHaveBeenCalledWith({ phone: '9876543210' })
  })

  it('swaps from/to', () => {
    const onChange = vi.fn()
    renderWithIntl(<PostForm form={FULL} onChange={onChange} onSubmit={() => {}} submitting={false} />)
    fireEvent.click(screen.getByRole('button', { name: /swap pickup and drop/i }))
    expect(onChange).toHaveBeenCalledWith({ from: FULL.to, to: FULL.from })
  })
})
