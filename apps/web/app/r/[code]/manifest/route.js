import manifest from '@/app/manifest'
import { INVITE_CODE_RE } from '@/features/referrals/lib/invite'

/**
 * Per-invite manifest, linked only from the /r/<code> page. A home-screen app on iPhone
 * has its own storage (not Safari's), so the code saved in Safari is lost on install;
 * starting the installed app at /r/<code> saves it again inside the app. `id` stays the
 * main manifest's (start_url /feed) so it's the same app identity.
 */
export async function GET(_request, { params }) {
  const { code } = await params
  if (!INVITE_CODE_RE.test(code)) return new Response(null, { status: 404 })
  const body = { ...manifest(), id: '/feed', start_url: `/r/${code}` }
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/manifest+json', 'cache-control': 'no-store' },
  })
}
