/* eslint-disable */
// EaseCab app-shell service worker (Step 25). Hand-rolled; owns scope '/'. The
// FCM worker (firebase-messaging-sw.js) is registered at a narrower scope
// (/firebase-cloud-messaging-push-scope) so the two coexist without clashing.
// v2: purges RSC payloads the v1 catch-all cached (stale language after a switch).
const CACHE = 'easecab-shell-v3' // v3: purge cached pre-rebrand icons
const OFFLINE_URL = '/offline'
// Only precache URLs guaranteed to exist (icons cache lazily at runtime so a
// not-yet-generated icon can never fail install via addAll).
const PRECACHE = [OFFLINE_URL, '/manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return // let Firebase/cross-origin pass
  if (url.pathname.startsWith('/api/')) return // never cache API / authed data

  // Navigations: network-first, cache the shell, fall back to cache → /offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copy))
          return res
        })
        .catch(() => caches.match(request).then((c) => c || caches.match(OFFLINE_URL)))
    )
    return
  }

  // Static GET: cache-first with runtime fill — immutable assets ONLY. Everything else
  // (RSC payloads `?_rsc=`, locale-dependent data) must hit the network: caching an RSC
  // payload served the old language after a switch until a hard refresh.
  if (!/^\/(_next\/static|icons|images)\//.test(url.pathname)) return
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return res
        })
        .catch(() => cached)
    })
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})
