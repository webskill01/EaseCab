import { describe, it, expect, beforeEach } from 'vitest'
import { saveRepostDraft, takeRepostDraft } from '../repostDraft'

describe('repostDraft', () => {
  beforeEach(() => sessionStorage.clear())

  it('save then take returns the draft and clears it (single-use)', () => {
    const draft = { from: { id: 'c1', name: 'Delhi' }, to: { id: null, name: 'Pinjore' }, vehicle: 'Innova', fare: '4200' }
    saveRepostDraft(draft)
    expect(takeRepostDraft()).toEqual(draft)
    expect(takeRepostDraft()).toBeNull() // consumed
  })

  it('take returns null when no draft was saved', () => {
    expect(takeRepostDraft()).toBeNull()
  })
})
