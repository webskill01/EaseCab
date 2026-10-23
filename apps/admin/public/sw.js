// ponytail: install-only service worker. Admin data must always be live, so nothing is
// cached; the fetch handler just passes through (some browsers want one to offer install).
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})
