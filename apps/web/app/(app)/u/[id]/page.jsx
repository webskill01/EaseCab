import { PosterProfileScreen } from '@/features/profile/components/PosterProfileScreen'

/** Public poster profile (T3-2). The id is the user being viewed. */
export default async function PosterProfilePage({ params }) {
  const { id } = await params
  return <PosterProfileScreen userId={id} />
}
