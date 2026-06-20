import { describe, it, expect } from 'vitest'
import { PERM, normPerm } from '../appPerms'

describe('normPerm', () => {
  it('passes granted/denied through', () => {
    expect(normPerm('granted')).toBe(PERM.GRANTED)
    expect(normPerm('denied')).toBe(PERM.DENIED)
  })

  it('folds the two "not decided" spellings to PROMPT', () => {
    expect(normPerm('prompt')).toBe(PERM.PROMPT) // Permissions API
    expect(normPerm('default')).toBe(PERM.PROMPT) // Notification.permission
  })

  it('treats anything unknown/absent as UNSUPPORTED', () => {
    expect(normPerm(undefined)).toBe(PERM.UNSUPPORTED)
    expect(normPerm('weird')).toBe(PERM.UNSUPPORTED)
  })
})
