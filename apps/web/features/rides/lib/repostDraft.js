/**
 * Cross-screen repost hand-off (My Rides → Post). The Repost chip stashes a form
 * draft here, then navigates to /post where PostScreen consumes it once on mount.
 * sessionStorage (not a store/context) keeps it dead-simple and tab-scoped; the
 * draft is single-use so a later manual visit to /post starts blank.
 */
const KEY = 'easecab:repostDraft'

/** Stash a repost draft for the Post screen to prefill. @param {object} draft */
export function saveRepostDraft(draft) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(KEY, JSON.stringify(draft))
}

/** Read + clear the repost draft (single-use). @returns {object|null} */
export function takeRepostDraft() {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem(KEY)
  if (!raw) return null
  sessionStorage.removeItem(KEY)
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}
