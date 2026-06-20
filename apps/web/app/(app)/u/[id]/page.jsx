import { PosterProfileScreen } from '@/features/profile/components/PosterProfileScreen'

/** Public poster profile (T3-2). The id is the user being viewed. */
export default function PosterProfilePage({ params }) {
  return <PosterProfileScreen userId={params.id} />
}
