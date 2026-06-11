import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listMyPosts, closeMyPost, deleteMyPost } from '../services/myRidesApi'
import { toMyPostVM } from '../lib/normalize'

/** The caller's posted rides + lifecycle mutations (My Rides → Posted). */
export function useMyPostedRides() {
  const qc = useQueryClient()
  const query = useQuery({ queryKey: ['myposts'], queryFn: () => listMyPosts(), staleTime: 30000 })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['myposts'] })
  const markDone = useMutation({ mutationFn: (id) => closeMyPost(id), onSuccess: invalidate })
  const remove = useMutation({ mutationFn: (id) => deleteMyPost(id), onSuccess: invalidate })
  const posts = (query.data?.posts ?? []).map(toMyPostVM)
  return {
    posts,
    isLoading: query.isLoading,
    isError: query.isError,
    isEmpty: !query.isLoading && !query.isError && posts.length === 0,
    markDone: (id) => markDone.mutate(id),
    remove: (id) => remove.mutate(id),
    isMutating: markDone.isPending || remove.isPending,
  }
}
