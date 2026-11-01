import { INVITE_KEY, INVITE_CODE_RE } from '@/features/referrals/lib/invite'

const APP_ID = 'com.easecab.app'

/**
 * Invite link (easecab.com/r/<code>). A plain HTML response, not a React page, so the
 * redirect runs instantly — still inside the tap's user gesture, which Android needs to
 * hand off to another app. It stores the code (the signed-in shell auto-claims it), then:
 * Android browser → Play Store app via a market intent (web Play page as fallback);
 * iPhone Safari → "Add to Home Screen" steps (no Play Store there); installed app /
 * desktop → into EaseCab. The Play link also carries the code as `referrer` for a future
 * Install Referrer read in the native app. iPhone home-screen apps don't share Safari's
 * storage, so this page links a per-invite manifest whose start_url is this same link:
 * the installed app opens here first, saves the code in its own storage, and goes to /feed.
 */
export async function GET(_request, { params }) {
  const { code } = await params // a Promise in Next 15+
  // Relative Location: behind nginx, request.url's host is localhost:3000.
  if (!INVITE_CODE_RE.test(code)) return new Response(null, { status: 302, headers: { location: '/' } })

  const referrer = encodeURIComponent(`ref=${code}`)
  const play = `https://play.google.com/store/apps/details?id=${APP_ID}&referrer=${referrer}`
  const market = `intent://details?id=${APP_ID}&referrer=${referrer}#Intent;scheme=market;package=com.android.vending;S.browser_fallback_url=${encodeURIComponent(play)};end`
  const js = (v) => JSON.stringify(v)

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>EaseCab</title>
<link rel="manifest" href="/r/${code}/manifest"><link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="EaseCab"></head>
<body style="font-family:system-ui,sans-serif;text-align:center;padding:48px 16px;color:#334155">
<div id="open"><p>Opening EaseCab…</p><p><a href="${play}" style="color:#2563eb;font-weight:700">Get EaseCab on Google Play</a></p></div>
<div id="ios" hidden style="max-width:360px;margin:0 auto;text-align:left">
<img src="/icons/icon-192.png" alt="" width="72" height="72" style="display:block;margin:0 auto 16px;border-radius:16px">
<h1 style="font-size:22px;text-align:center;color:#0f172a;margin:0 0 20px">Add EaseCab to your iPhone</h1>
<ol style="padding-left:20px;line-height:1.6;font-size:16px">
<li>Open this link in <b>Safari</b> (in WhatsApp, tap ⋯ → Open in Safari)</li>
<li>Tap the <b>Share</b> button <span aria-hidden="true">⬆︎</span> at the bottom</li>
<li>Tap <b>"Add to Home Screen"</b>, then <b>Add</b></li>
<li>Open EaseCab from your home screen and log in</li>
</ol>
<p style="text-align:center;margin-top:24px"><a href="/" style="color:#2563eb;font-weight:700">Continue in browser</a></p>
</div>
<script>
try { localStorage.setItem(${js(INVITE_KEY)}, ${js(code)}) } catch (e) {}
var ua = navigator.userAgent;
var standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
var ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1); // iPadOS says Mac
var android = /Android/i.test(ua) && !standalone;
if (ios && !standalone) { document.getElementById('open').hidden = true; document.getElementById('ios').hidden = false; }
else location.replace(android ? ${js(market)} : ios ? '/feed' : '/');
</script></body></html>`

  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } })
}
