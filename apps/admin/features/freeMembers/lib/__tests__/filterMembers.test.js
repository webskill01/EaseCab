import { describe, it, expect } from 'vitest'
import { filterMembers } from '../filterMembers'

const A = { userId: 'a', label: 'Raju', name: null, note: 'barter', phone: '+919876541111', monthsGranted: 1, addedAt: '2026-10-01', validUntil: '2026-12-01' }
const B = { userId: 'b', label: null, name: 'Sunil', note: null, phone: '+919876542222', monthsGranted: 6, addedAt: '2026-10-10', validUntil: '2026-11-01' }
const C = { userId: 'c', label: 'Old', name: null, note: null, phone: '+919876543333', monthsGranted: 3, addedAt: '2026-09-01', validUntil: null }
const ids = (xs) => xs.map((x) => x.userId)

describe('filterMembers', () => {
  it('defaults to everyone, newest added first', () => {
    expect(ids(filterMembers([A, B, C]))).toEqual(['b', 'a', 'c'])
  })
  it('filters active / ended', () => {
    expect(ids(filterMembers([A, B, C], { status: 'active' }))).toEqual(['b', 'a'])
    expect(ids(filterMembers([A, B, C], { status: 'ended' }))).toEqual(['c'])
  })
  it('searches name, label, note and last 4 digits', () => {
    expect(ids(filterMembers([A, B, C], { q: 'sun' }))).toEqual(['b'])
    expect(ids(filterMembers([A, B, C], { q: 'BARTER' }))).toEqual(['a'])
    expect(ids(filterMembers([A, B, C], { q: '3333' }))).toEqual(['c'])
  })
  it('sorts ending soonest (ended last) and most months', () => {
    expect(ids(filterMembers([A, B, C], { sort: 'ending' }))).toEqual(['b', 'a', 'c'])
    expect(ids(filterMembers([A, B, C], { sort: 'months' }))).toEqual(['b', 'c', 'a'])
  })
  it('does not mutate the input', () => {
    const list = [A, B, C]
    filterMembers(list, { sort: 'months' })
    expect(ids(list)).toEqual(['a', 'b', 'c'])
  })
})

describe('filterMembers phone search', () => {
  it('matches any run of digits, ignoring spaces and +91', () => {
    expect(ids(filterMembers([A, B, C], { q: '98765 42222' }))).toEqual(['b'])
    expect(ids(filterMembers([A, B, C], { q: '1111' }))).toEqual(['a'])
  })
})
