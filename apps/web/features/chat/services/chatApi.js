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

/** Mark the caller's inbound messages in a chat read (read receipts). */
export async function markRead(chatId) {
  await apiFetch(`/chats/${chatId}/read`, { method: 'POST' })
}

/** Open (or reuse) the 1:1 chat for a posted ride the caller has contacted. @returns {Promise<object>} */
export async function openChat(postedRideId) {
  const { data } = await apiFetch('/chats', { method: 'POST', body: JSON.stringify({ postedRideId }) })
  return data
}

/** Mint a Firebase custom token for client-side Firestore chat reads. @returns {Promise<string>} */
export async function mintFirebaseToken() {
  const { data } = await apiFetch('/auth/firebase-token', { method: 'POST' })
  return data.token
}
