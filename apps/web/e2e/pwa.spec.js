import { test, expect } from '@playwright/test'

test('manifest is reachable and describes an installable PWA', async ({ request }) => {
  const res = await request.get('/manifest.webmanifest')
  expect(res.ok()).toBeTruthy()
  const m = await res.json()
  expect(m.name).toContain('EaseCab')
  expect(m.display).toBe('standalone')
  expect(m.start_url).toBe('/feed')
  expect(Array.isArray(m.icons)).toBe(true)
  expect(m.icons.some((i) => i.purpose === 'maskable')).toBe(true)
})
