import { describe, it, expect } from 'vitest'
import { GET } from '../route'

const CODE = '11111111-1111-4111-8111-111111111111'
const call = (code) => GET(new Request(`https://easecab.com/r/${code}`), { params: Promise.resolve({ code }) })

describe('GET /r/[code]', () => {
  it('stores the code and hands Android off to the Play Store app', async () => {
    const html = await (await call(CODE)).text()
    expect(html).toContain(`localStorage.setItem("ec_ref", "${CODE}")`)
    expect(html).toContain('scheme=market;package=com.android.vending')
    expect(html).toContain(`referrer=${encodeURIComponent(`ref=${CODE}`)}`)
  })

  it('sends a malformed code home', async () => {
    const res = await call('<script>')
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/')
  })
})
