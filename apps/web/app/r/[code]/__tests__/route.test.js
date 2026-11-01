import { describe, it, expect } from 'vitest'
import { GET } from '../route'
import { GET as manifestGET } from '../manifest/route'

const CODE = '11111111-1111-4111-8111-111111111111'
const call = (code) => GET(new Request(`https://easecab.com/r/${code}`), { params: Promise.resolve({ code }) })

describe('GET /r/[code]', () => {
  it('stores the code and hands Android off to the Play Store app', async () => {
    const html = await (await call(CODE)).text()
    expect(html).toContain(`localStorage.setItem("ec_ref", "${CODE}")`)
    expect(html).toContain('scheme=market;package=com.android.vending')
    expect(html).toContain(`referrer=${encodeURIComponent(`ref=${CODE}`)}`)
  })

  it('gives iPhone the home-screen steps + a manifest that reopens this link', async () => {
    const html = await (await call(CODE)).text()
    expect(html).toContain(`<link rel="manifest" href="/r/${CODE}/manifest">`)
    expect(html).toContain('Add to Home Screen')
    const res = await manifestGET(new Request('https://easecab.com/x'), { params: Promise.resolve({ code: CODE }) })
    const m = await res.json()
    expect(m).toMatchObject({ id: '/feed', start_url: `/r/${CODE}`, display: 'standalone' })
  })

  it('404s the manifest for a malformed code', async () => {
    const res = await manifestGET(new Request('https://easecab.com/x'), { params: Promise.resolve({ code: 'x' }) })
    expect(res.status).toBe(404)
  })

  it('sends a malformed code home', async () => {
    const res = await call('<script>')
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/')
  })
})
