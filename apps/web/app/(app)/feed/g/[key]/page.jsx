import { GroupThread } from '@/features/groupMode/components/GroupThread'

/** Group Mode thread (Phase 31): one city group / Sab Rides / Driver Duties. */
export default async function GroupThreadPage({ params }) {
  const { key } = await params
  return <GroupThread groupKey={key} />
}
