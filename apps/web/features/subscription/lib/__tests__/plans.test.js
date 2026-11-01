import { describe, it, expect } from 'vitest'
import { PLANS, planSavings, rupees } from '../plans'

describe('plans', () => {
  it('matches the API price table (paise ÷ 100)', () => {
    expect(PLANS.map((p) => [p.id, p.price])).toEqual([['m1', 149], ['m3', 399], ['m6', 749], ['m12', 1199]])
  })

  it('computes MRP, savings and per-month price', () => {
    expect(planSavings(PLANS[0])).toEqual({ mrp: 149, off: 0, pct: 0, perMonth: 149 })
    expect(planSavings(PLANS[1])).toEqual({ mrp: 447, off: 48, pct: 11, perMonth: 133 })
    expect(planSavings(PLANS[2])).toEqual({ mrp: 894, off: 145, pct: 16, perMonth: 125 })
    expect(planSavings(PLANS[3])).toEqual({ mrp: 1788, off: 589, pct: 33, perMonth: 100 })
  })

  it('formats rupees with Indian grouping', () => {
    expect(rupees(1199)).toBe('₹1,199')
  })
})
