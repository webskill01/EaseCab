'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { User, Crown, BellEdit, ChevR } from '@/components/ui/icons'
import { LogoutButton } from '@/features/shell/components/LogoutButton'
import { useProfile } from '../hooks/useProfile'
import { useUpdateProfile } from '../hooks/useUpdateProfile'
import { profileToForm } from '../lib/profileForm'
import { ProfileForm } from './ProfileForm'
import { CompletenessBanner } from './CompletenessBanner'
import { VerificationCards } from './VerificationCards'

/** Profile hub (SCREENS §6) — read view + inline edit + verification center. */
export function ProfileScreen() {
  const t = useTranslations('profile')
  const router = useRouter()
  const { data: profile, isLoading, isError } = useProfile()
  const [editing, setEditing] = useState(false)
  const update = useUpdateProfile()

  if (isLoading) return <div className="flex flex-1 items-center justify-center text-ec-ink40">…</div>
  if (isError || !profile) return <div className="flex flex-1 items-center justify-center px-6 text-center text-[14px] font-semibold text-ec-danger">{t('error.load')}</div>

  const v = profile.verification
  const phone = `+91 ${String(profile.phone).replace(/^\+91/, '')}`

  // close the editor once a save lands
  if (update.saved && editing) setEditing(false)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-ec-bg p-4">
      <header className="flex items-center gap-3.5">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-ec-sky bg-ec-sky text-ec-blue">
          {profile.profilePicUrl ? <img src={profile.profilePicUrl} alt="" className="h-full w-full object-cover" /> : <User size={30} />}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[18px] font-extrabold text-ec-ink">{profile.name || '—'}</p>
          <p className="text-[13px] font-semibold text-ec-ink60">{phone}</p>
        </div>
      </header>

      {!profile.profileComplete && <CompletenessBanner onAction={() => (v.aadhaarVerified ? setEditing(true) : router.push('/verify?intent=l1'))} />}

      {editing ? (
        <div className="rounded-2xl border border-ec-line bg-white p-4">
          <ProfileForm initial={profileToForm(profile)} onSubmit={(body) => update.save(body)} submitting={update.saving} errorKey={update.errorKey} />
          <button type="button" onClick={() => setEditing(false)} className="mt-3 w-full text-[13px] font-bold text-ec-ink60">{t('cancel')}</button>
        </div>
      ) : (
        <button type="button" onClick={() => setEditing(true)} className="h-11 rounded-xl border-[1.5px] border-ec-line bg-white text-[14px] font-extrabold text-ec-blueInk">{t('edit')}</button>
      )}

      <VerificationCards
        verification={v}
        onStartL1={() => router.push('/verify?intent=l1')}
        onStartL2={() => router.push('/verify?intent=driver')}
      />

      <nav className="overflow-hidden rounded-2xl border border-ec-line bg-white">
        <button type="button" onClick={() => router.push('/membership')} className="flex w-full items-center gap-3 border-b border-ec-line px-4 py-3.5 text-left">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ec-sky text-ec-blue"><Crown size={18} /></span>
          <span className="flex-1 text-[14px] font-bold text-ec-ink">{t('nav.membership')}</span>
          <ChevR size={16} className="text-ec-ink40" />
        </button>
        <button type="button" onClick={() => router.push('/settings')} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ec-sky text-ec-blue"><BellEdit size={18} /></span>
          <span className="flex-1 text-[14px] font-bold text-ec-ink">{t('nav.settings')}</span>
          <ChevR size={16} className="text-ec-ink40" />
        </button>
      </nav>
      <LogoutButton />
    </div>
  )
}
