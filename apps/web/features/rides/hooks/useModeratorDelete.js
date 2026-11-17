import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { moderatorRemoveRide } from '../services/ridesApi'

/** Delete-any-card for moderator numbers (profile.isModerator), behind a confirm sheet. */
export function useModeratorDelete() {
  const qc = useQueryClient()
  const [target, setTarget] = useState(null)
  const remove = useMutation({
    mutationFn: moderatorRemoveRide,
    onSuccess: () => ['feed', 'dutiesCount'].forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  })
  return {
    target,
    ask: setTarget,
    close: () => setTarget(null),
    run: () => { if (target) remove.mutate(target); setTarget(null) },
  }
}
