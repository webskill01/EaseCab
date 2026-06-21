import { apiFetch } from '@/lib/api/client'

/**
 * Blocked-users management client (Profile → Blocked). Blocking itself is initiated
 * from the chat overflow menu (chatApi.blockUser); this surface lists and undoes them.
 */

/** The caller's blocked users (name·city·dp). @returns {Promise<Array<object>>} */
export async function listBlocks() {
  const { data } = await apiFetch('/blocks')
  return data.blocks
}

/** Unblock a user. Idempotent server-side. @returns {Promise<void>} */
export async function unblockUser(blockedId) {
  await apiFetch(`/blocks/${blockedId}`, { method: 'DELETE' })
}
