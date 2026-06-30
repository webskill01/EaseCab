/* eslint-disable */
// FCM-only background-message worker (EaseCab Step 23). Deliberately minimal and
// separate from the Step-25 app-shell/offline service worker. Config is passed as
// query params at registration (all public values) so this static file stays generic.
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

// Backend sends DATA-ONLY messages, so onBackgroundMessage is the SOLE renderer —
// no duplicate, icon-less notification from FCM's auto-display. Title/body/url ride
// in payload.data. `tag` collapses repeat alerts of the same source instead of
// stacking; the action + body-tap both deep-link via the notificationclick handler.
firebase.messaging().onBackgroundMessage((payload) => {
  const d = payload.data || {}
  self.registration.showNotification(d.title || 'EaseCab', {
    body: d.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    tag: d.source ? `ride-${d.source}` : 'ride',
    renotify: true,
    data: { url: d.url || '/feed' },
    actions: [{ action: 'view', title: 'View ride' }],
  })
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
