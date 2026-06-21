import { apiFetch } from '@/lib/api/client'

/**
 * Chat REST client (Step 22). The list + history + send + mark-read all go through
 * the API (the sole writer); the live thread additionally subscribes to Firestore
 * via firestoreClient. `mintFirebaseToken` exchanges our cookie session for a
 * Firebase custom token so that subscription can authenticate.
 */

/** The caller's enriched chat list (name·route·preview·unread). @returns {Promise<Array<object>>} */
export async function listChats() {
  const { data } = await apiFetch('/chats')
  return data.chats
}

/** One page of a chat's message history, newest-first. @returns {Promise<{messages, nextCursor}>} */
export async function listMessages(chatId, cursor) {
  const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
  const { data, meta } = await apiFetch(`/chats/${chatId}/messages${qs}`)
  return { messages: data.messages, nextCursor: meta?.nextCursor ?? null }
}

/** Send a text message (API persists + mirrors to Firestore). @returns {Promise<object>} */
export async function sendMessage(chatId, messageText) {
  const { data } = await apiFetch(`/chats/${chatId}/messages`, { method: 'POST', body: JSON.stringify({ messageText }) })
  return data
}

/** Send an image message by its verified R2 key (from a chat_image presign). @returns {Promise<object>} */
export async function sendImageMessage(chatId, attachmentKey) {
  const { data } = await apiFetch(`/chats/${chatId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ messageType: 'image', attachmentKey }),
  })
  return data
}

/** Mark the caller's inbound messages in a chat read (read receipts). */
export async function markRead(chatId) {
  await apiFetch(`/chats/${chatId}/read`, { method: 'POST' })
}

/** Presence heartbeat (P12-8): stamp the caller's lastActiveAt on the chat doc. */
export async function touchPresence(chatId) {
  await apiFetch(`/chats/${chatId}/presence`, { method: 'POST' })
}

/** Open (or reuse) the 1:1 chat for a posted ride the caller has contacted. @returns {Promise<object>} */
export async function openChat(postedRideId) {
  const { data } = await apiFetch('/chats', { method: 'POST', body: JSON.stringify({ postedRideId }) })
  return data
}

/** Block a user (chat overflow menu, P12-4c). Idempotent server-side. */
export async function blockUser(blockedId) {
  await apiFetch('/blocks', { method: 'POST', body: JSON.stringify({ blockedId }) })
}

/** Mint a Firebase custom token for client-side Firestore chat reads. @returns {Promise<string>} */
export async function mintFirebaseToken() {
  const { data } = await apiFetch('/auth/firebase-token', { method: 'POST' })
  return data.token
}
