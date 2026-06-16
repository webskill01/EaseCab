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

firebase.messaging().onBackgroundMessage((payload) => {
  const n = payload.notification || {}
  self.registration.showNotification(n.title || 'EaseCab', {
    body: n.body || '',
    icon: '/icons/icon-192.png',
    data: payload.data || {},
  })
})
