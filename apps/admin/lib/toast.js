/**
 * Tiny toast store (module-level, read by <Toaster/> via useSyncExternalStore).
 * Mutations feed it from the QueryClient's MutationCache: `meta.success` (string or
 * fn(variables)) on success, the API's generic error message on failure.
 */
let toasts = []
const listeners = new Set()
let nextId = 1

const emit = () => listeners.forEach((l) => l())

export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const getToasts = () => toasts

export function dismissToast(id) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

/** @param {string} message @param {'success'|'error'} [tone] */
export function toast(message, tone = 'success') {
  const id = nextId++
  toasts = [...toasts.slice(-2), { id, message, tone }]
  emit()
  setTimeout(() => dismissToast(id), 3500)
}
