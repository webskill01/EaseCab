import { test, expect } from '@playwright/test'

/**
 * Chat E2E (Step 22). AuthGuard probe, /me/profile, /chats, /chats/:id/messages,
 * /chats/:id/read and /auth/firebase-token are network-mocked; the Firestore
 * realtime layer is driven by the deterministic `window.__ecChatSeam` seam that the
 * firestoreClient boundary uses in NEXT_PUBLIC_E2E mode.
 */
const ok = (data, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify({ success: true, data }) })

const PROFILE = { id: 'u1', phone: '+919876543210', name: 'Me', verification: {} }
const CHAT_ROW = {
  id: 'chat-1', postedRideId: 'p1', isActive: true, otherName: 'Driver Singh',
  fromCityName: 'Ludhiana', toCityName: 'Delhi', lastMessageText: 'see you soon',
  lastMessageAt: '2026-06-13T01:00:00.000Z', unreadCount: 2,
}

async function mockBase(page) {
  await page.route('**/api/v1/auth/refresh', (r) => r.fulfill(ok({ refreshed: true })))
  await page.route('**/api/v1/me/profile', (r) => r.fulfill(ok(PROFILE)))
  await page.route('**/api/v1/auth/firebase-token', (r) => r.fulfill(ok({ token: 'ct:u1' }, 201)))
}

/** Inject a controllable Firestore seam before any app code runs. */
async function installSeam(page, { isActive = true } = {}) {
  await page.addInitScript((active) => {
    const subs = []
    window.__ecChatSeam = {
      subscribe(chatId, { onMeta, onMessages }) {
        const s = { chatId, onMeta, onMessages }
        subs.push(s)
        onMeta({ isActive: active, posterId: 'other', initiatorId: 'u1' })
        onMessages([])
        return () => {}
      },
      push(chatId, msg) { subs.filter((s) => s.chatId === chatId).forEach((s) => s.onMessages([msg])) },
    }
  }, isActive)
}

test('list → open thread → send a message → receive an inbound reply', async ({ page }) => {
  await mockBase(page)
  await installSeam(page)
  await page.route('**/api/v1/chats', (r) => {
    if (r.request().method() === 'POST') return r.fulfill(ok({ id: 'chat-1' }, 201))
    return r.fulfill(ok({ chats: [CHAT_ROW] }))
  })
  await page.route('**/api/v1/chats/chat-1/messages', (r) => {
    if (r.request().method() === 'POST') return r.fulfill(ok({ id: 'm-new', messageText: 'see you', messageType: 'text', senderId: 'u1', sentAt: new Date().toISOString() }, 201))
    return r.fulfill(ok({ messages: [] }))
  })
  await page.route('**/api/v1/chats/chat-1/read', (r) => r.fulfill(ok({ readAt: 't' }, 201)))

  await page.goto('/messages')
  const row = page.getByRole('button', { name: /Driver Singh/ })
  await expect(row).toBeVisible()
  await expect(row.getByText('2')).toBeVisible() // unread pill on the row

  await row.click()
  await expect(page).toHaveURL(/\/messages\/chat-1/)

  // send → optimistic bubble appears
  await page.getByPlaceholder('Message').fill('see you')
  await page.getByRole('button', { name: /send/i }).click()
  await expect(page.getByText('see you')).toBeVisible()

  // an inbound message arrives over the realtime seam
  await page.evaluate(() => window.__ecChatSeam.push('chat-1', { id: 'm2', senderId: 'other', messageText: 'on my way', sentAt: new Date().toISOString() }))
  await expect(page.getByText('on my way')).toBeVisible()
})

test('an expired chat is read-only (composer disabled)', async ({ page }) => {
  await mockBase(page)
  await installSeam(page, { isActive: false })
  await page.route('**/api/v1/chats/chat-2/messages', (r) => r.fulfill(ok({ messages: [] })))
  await page.route('**/api/v1/chats/chat-2/read', (r) => r.fulfill(ok({ readAt: 't' }, 201)))

  await page.goto('/messages/chat-2')
  await expect(page.getByPlaceholder(/read-only/i)).toBeDisabled()
})
