import { INVITE_KEY, INVITE_CODE_RE } from '@/features/referrals/lib/invite'

const APP_ID = 'com.easecab.app'

/**
 * Invite link (easecab.com/r/<code>). A plain HTML response, not a React page, so the
 * redirect runs instantly — still inside the tap's user gesture, which Android needs to
 * hand off to another app. It stores the code (the signed-in shell auto-claims it), then:
 * Android browser → Play Store app via a market intent (web Play page as fallback);
 * installed app / iPhone / desktop → into EaseCab. The Play link also carries the code as
 * `referrer` for a future Install Referrer read in the native app.
 */
export function GET(request, { params }) {
  const { code } = params
  if (!INVITE_CODE_RE.test(code)) return Response.redirect(new URL('/', request.url), 302)

  const referrer = encodeURIComponent(`ref=${code}`)
  const play = `https://play.google.com/store/apps/details?id=${APP_ID}&referrer=${referrer}`
  const market = `intent://details?id=${APP_ID}&referrer=${referrer}#Intent;scheme=market;package=com.android.vending;S.browser_fallback_url=${encodeURIComponent(play)};end`
  const js = (v) => JSON.stringify(v)

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>EaseCab</title></head>
<body style="font-family:system-ui,sans-serif;text-align:center;padding:48px 16px;color:#334155">
<p>Opening EaseCab…</p><p><a href="${play}" style="color:#2563eb;font-weight:700">Get EaseCab on Google Play</a></p>
<script>
try { localStorage.setItem(${js(INVITE_KEY)}, ${js(code)}) } catch (e) {}
var android = /Android/i.test(navigator.userAgent) && !matchMedia('(display-mode: standalone)').matches;
location.replace(android ? ${js(market)} : '/');
</script></body></html>`

  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } })
}
