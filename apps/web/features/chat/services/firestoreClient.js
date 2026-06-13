import { signInWithCustomToken } from 'firebase/auth'
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore'
import { getFirebaseAuth, getFirebaseFirestore } from '../../auth/lib/firebaseClient'

/**
 * Firestore realtime boundary for chat (Step 22). The API is the SOLE writer; here
 * the client signs in with a custom token (uid == our userId, minted by
 * POST /auth/firebase-token) and SUBSCRIBES read-only to the chat doc (isActive +
 * per-participant lastReadAt) and its messages subcollection. The chat service/hook
 * depends only on this `subscribeToChat` interface, never on the Firebase SDK — so
 * the transport can be swapped without touching UI logic.
 *
 * In E2E mode a window-injected fake store (`window.__ecChatSeam`) drives snapshots
 * deterministically, since Firestore can't run against live infra in a headless spec.
 * Coverage-excluded like firebaseClient/otpClient/razorpayClient.
 *
 * @param {object} args
 * @param {string} args.chatId
 * @param {string} args.token - Firebase custom token from the mint endpoint
 * @param {(meta: object) => void} args.onMeta - chat doc snapshots (isActive, lastReadAt)
 * @param {(messages: Array<object>) => void} args.onMessages - ordered message snapshots
 * @returns {() => void} unsubscribe
 */
export function subscribeToChat({ chatId, token, onMeta, onMessages }) {
  if (process.env.NEXT_PUBLIC_E2E === 'true') {
    return window.__ecChatSeam.subscribe(chatId, { onMeta, onMessages })
  }
  const db = getFirebaseFirestore()
  const stop = []
  let cancelled = false
  signInWithCustomToken(getFirebaseAuth(), token).then(() => {
    if (cancelled) return
    stop.push(onSnapshot(doc(db, 'chats', chatId), (snap) => onMeta(snap.data() ?? {})))
    const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('sentAt', 'asc'))
    stop.push(onSnapshot(q, (snap) => onMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })))))
  })
  return () => { cancelled = true; stop.forEach((fn) => fn()) }
}
