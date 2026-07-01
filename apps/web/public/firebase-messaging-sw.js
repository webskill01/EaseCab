/* eslint-disable */
// FCM push worker (EaseCab Step 23). Deliberately minimal and separate from the
// Step-25 app-shell/offline worker. Config is passed as query params at registration
// (all public values) so this static file stays generic.
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

const p = new URLSearchParams(self.location.search)
firebase.initializeApp({
  apiKey: p.get('apiKey'),
  authDomain: p.get('authDomain'),
  projectId: p.get('projectId'),
  messagingSenderId: p.get('messagingSenderId'),
  appId: p.get('appId'),
})

// Take over the moment a new version is deployed. WITHOUT this the browser default
// keeps the OLD worker running until every app window closes — and a TWA almost never
// fully closes, so a shipped push fix never activates (the stale worker keeps rendering
// the old duplicate notification). skipWaiting + clients.claim make each deploy the
// sole live renderer immediately.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

// We deliberately DO NOT call firebase.messaging()/onBackgroundMessage. That SDK path
// installs its own push handler that (a) defers to a foreground client without showing a
// notification and (b) doesn't reliably render inside the push event's lifetime — either
// case leaves the event settling with nothing shown, so Chrome fires its own generic
// "This site has been updated in the background" notification (icon-less) ALONGSIDE ours.
// Owning the raw `push` event and awaiting showNotification inside waitUntil guarantees
// exactly one notification, shown within the event, in both foreground and background.
// (getToken lives client-side and only needs this worker's push subscription, not the
// SDK's SW message handler — so dropping it costs nothing.)
//
// Backend sends DATA-ONLY messages; FCM wraps the custom map under `.data` (older/edge
// deliveries put it at the top level — handle both). `tag` collapses repeat alerts of
// the same source; the action + body-tap both deep-link via the notificationclick handler.
self.addEventListener('push', (event) => {
  let d = {}
  try {
    const payload = event.data ? event.data.json() : {}
    d = payload.data || payload || {}
  } catch (_) {
    d = {} // unparseable payload — still show a generic tap-through rather than nothing
  }
  event.waitUntil(
    self.registration.showNotification(d.title || 'EaseCab', {
      body: d.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-96.png',
      tag: d.source ? `ride-${d.source}` : 'ride',
      renotify: true,
      data: { url: d.url || '/feed' },
      actions: [{ action: 'view', title: 'View ride' }],
    }),
  )
})

// Tapping the notification (or its "View ride" action) must OPEN the app — focus an
// existing window if one is open, otherwise launch a new one at the deep-link.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/feed'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ('focus' in w) {
          if ('navigate' in w) w.navigate(url).catch(() => {})
          return w.focus()
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
