import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { closeMyPost, deleteMyPost } from '../services/myRidesApi'
import { repostDraftFromPost } from '../lib/postForm'
import { saveRepostDraft } from '../lib/repostDraft'

/**
 * Owner actions on the caller's own Driver Duties card in the feed: mark done /
 * delete (behind a confirm sheet) and repost. Refreshes the feed, the tab badge
 * and My Rides so every surface agrees.
 */
export function useOwnPostActions() {
  const qc = useQueryClient()
  const router = useRouter()
  const [confirm, setConfirm] = useState(null) // { kind: 'done'|'delete', post }
  const refresh = () => ['feed', 'dutiesCount', 'myposts'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
  const markDone = useMutation({ mutationFn: closeMyPost, onSuccess: refresh })
  const remove = useMutation({ mutationFn: deleteMyPost, onSuccess: refresh })

  return {
    confirm,
    askDone: (post) => setConfirm({ kind: 'done', post }),
    askDelete: (post) => setConfirm({ kind: 'delete', post }),
    closeConfirm: () => setConfirm(null),
    runConfirm: () => {
      if (!confirm) return
      ;(confirm.kind === 'done' ? markDone : remove).mutate(confirm.post.id)
      setConfirm(null)
    },
    // sourceId lets the Post screen delete this original once the repost publishes.
    repost: (post) => {
      saveRepostDraft({ ...repostDraftFromPost(post), sourceId: post.id })
      router.push('/post')
    },
  }
}
