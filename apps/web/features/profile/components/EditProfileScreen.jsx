'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ChevL } from '@/components/ui/icons'
import { useProfile } from '../hooks/useProfile'
import { useUpdateProfile } from '../hooks/useUpdateProfile'
import { profileToForm } from '../lib/profileForm'
import { ProfileForm } from './ProfileForm'

/** Edit-profile page (#20) — its own route, not inline. Saves then returns to /profile. */
export function EditProfileScreen() {
  const t = useTranslations('profile')
  const tc = useTranslations('common')
  const router = useRouter()
  const { data: profile, isLoading, isError } = useProfile()
  const update = useUpdateProfile()

  // Once a save lands, the ['profile'] cache is fresh — return to the hub.
  useEffect(() => { if (update.saved) router.push('/profile') }, [update.saved, router])

  if (isLoading) return <div className="flex flex-1 items-center justify-center text-ec-ink40">…</div>
  if (isError || !profile) return <div className="flex flex-1 items-center justify-center px-6 text-center text-[14px] font-semibold text-ec-danger">{t('error.load')}</div>

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-ec-bg">
      <div className="flex shrink-0 items-center gap-2 border-b border-ec-line bg-white px-3.5 py-3">
        <button type="button" onClick={() => router.push('/profile')} aria-label={tc('actions.back')} className="flex h-9 w-9 items-center justify-center rounded-lg text-ec-ink">
          <ChevL size={24} />
        </button>
        <div className="flex-1 text-[18px] font-extrabold tracking-tight text-ec-ink">{t('edit')}</div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <ProfileForm initial={profileToForm(profile)} onSubmit={(body) => update.save(body)} submitting={update.saving} errorKey={update.errorKey} />
      </div>
    </div>
  )
}
