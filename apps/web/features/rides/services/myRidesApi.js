import { apiFetch } from '@/lib/api/client'

/** My Rides API (client service). Posted-tab actions reuse posted-rides endpoints;
 * Contacted-tab reads the unified /me/contacted list. */

/** The caller's own posts. @returns {Promise<{posts}>} */
export async function listMyPosts() {
  const { data } = await apiFetch('/posted-rides/mine')
  return { posts: data.posts }
}

/** Owner marks a post done. @returns {Promise<{id,status}>} */
export async function closeMyPost(id) {
  const { data } = await apiFetch(`/posted-rides/${id}/close`, { method: 'POST' })
  return data
}

/** Owner soft-deletes a post. @returns {Promise<{id,status}>} */
export async function deleteMyPost(id) {
  const { data } = await apiFetch(`/posted-rides/${id}`, { method: 'DELETE' })
  return data
}

/** One page of the caller's contacted rides. @returns {Promise<{contacts,nextCursor}>} */
export async function listContacted({ cursor } = {}) {
  const p = new URLSearchParams()
  if (cursor) p.set('cursor', cursor)
  const qs = p.toString()
  const { data, meta } = await apiFetch(`/me/contacted${qs ? `?${qs}` : ''}`)
  return { contacts: data.contacts, nextCursor: meta?.nextCursor ?? null }
}
