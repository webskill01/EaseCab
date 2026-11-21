import { describe, it, expect } from 'vitest'
import { resultOf } from '../btResult'

describe('resultOf', () => {
  it('maps paid and cancelled', () => {
    expect(resultOf({ status: 'paid' })).toEqual({ kind: 'paid', noCharge: false })
    expect(resultOf({ status: 'cancelled' })).toEqual({ kind: 'cancelled', noCharge: true })
  })
  it('groups failures and only promises no charge when nothing could have been paid', () => {
    expect(resultOf({ status: 'failed', failureCode: 'portal_down' })).toEqual({ kind: 'siteDown', noCharge: true })
    expect(resultOf({ status: 'failed', failureCode: 'portal_error' })).toEqual({ kind: 'siteDown', noCharge: false })
    expect(resultOf({ status: 'failed', failureCode: 'payment_timeout' })).toEqual({ kind: 'payment', noCharge: false })
    expect(resultOf({ status: 'failed', failureCode: 'something_new' })).toEqual({ kind: 'error', noCharge: false })
  })
})
