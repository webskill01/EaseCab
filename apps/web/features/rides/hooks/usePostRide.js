import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { createPost } from '../services/postApi'
import { toCreateBody } from '../lib/postForm'

/**
 * Create-a-post mutation with the verification soft gate (Step 20). A
 * VERIFICATION_REQUIRED rejection flips `gated` (→ verify sheet); any other error
 * surfaces via `error` for an inline banner.
 */
export function usePostRide() {
  const [gated, setGated] = useState(false)
  const m = useMutation({
    mutationFn: (form) => createPost(toCreateBody(form)),
    onError: (err) => { if (err?.code === 'VERIFICATION_REQUIRED') setGated(true) },
  })
  return {
    submit: (form) => { setGated(false); m.mutate(form) },
    submitting: m.isPending,
    posted: m.isSuccess,
    gated,
    closeGate: () => setGated(false),
    error: m.error && m.error.code !== 'VERIFICATION_REQUIRED' ? m.error : null,
  }
}
