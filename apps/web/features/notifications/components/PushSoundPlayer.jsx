'use client'

import { useEffect } from 'react'

export const PUSH_SOUND_URL = '/sounds/notification.mp3'
const TWA_KEY = 'ec_twa'

/**
 * Inside the Play Store app (TWA) the native "Ride alerts" channel already plays this
 * sound, so the page must decline or it would play twice. A TWA launch carries an
 * android-app:// referrer on the first page only — remember it for the session.
 */
function inTwa() {
  try {
    if (document.referrer.startsWith('android-app://')) sessionStorage.setItem(TWA_KEY, '1')
    return sessionStorage.getItem(TWA_KEY) === '1'
  } catch {
    return document.referrer.startsWith('android-app://') // storage blocked — referrer only
  }
}

/**
 * Signed-in shell: plays EaseCab's own alert sound when the push worker asks (the app
 * is visible and a ride alert just arrived — see firebase-messaging-sw.js). Replies on
 * the message port whether playback really started, so the worker falls back to the
 * phone's default sound when autoplay blocks it. Renders nothing.
 */
export function PushSoundPlayer() {
  useEffect(() => {
    const sw = typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined
    if (!sw) return undefined
    const twa = inTwa()
    const audio = new Audio(PUSH_SOUND_URL)
    const onMessage = async (e) => {
      if (!e.data || e.data.type !== 'ec-play-sound' || !e.ports[0]) return
      if (twa) { e.ports[0].postMessage({ played: false }); return } // native channel sound
      let played = true
      try {
        audio.currentTime = 0
        await audio.play()
      } catch {
        played = false // autoplay blocked (no tap yet) — the worker uses the default sound
      }
      e.ports[0].postMessage({ played })
    }
    sw.addEventListener('message', onMessage)
    return () => sw.removeEventListener('message', onMessage)
  }, [])

  return null
}
