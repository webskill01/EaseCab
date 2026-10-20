'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import { PLAY_STORE_URL } from '@/features/landing/components/LandingHero'
import { saveInvite } from '@/features/referrals/lib/invite'

/**
 * Invite link landing (easecab.com/r/<code>): remember who invited, then send Android
 * browsers to the Play Store and everyone else (installed app, iPhone, desktop) into the app.
 */
export default function InvitePage() {
  const { code } = useParams()

  useEffect(() => {
    saveInvite(String(code))
    const inBrowserOnAndroid = /Android/i.test(navigator.userAgent) && !window.matchMedia('(display-mode: standalone)').matches
    window.location.replace(inBrowserOnAndroid ? PLAY_STORE_URL : '/')
  }, [code])

  return <div className="flex min-h-screen items-center justify-center bg-ec-bg text-ec-ink40">…</div>
}
