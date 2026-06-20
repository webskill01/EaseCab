'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { User, Shield, Crown, BellEdit, ChevR, Pin, Steer, Plus, Pencil, Headset, VehicleIcon, Info, List, Globe, Lock } from '@/components/ui/icons'
import { env } from '@/config/env'
import { LogoutButton } from '@/features/shell/components/LogoutButton'
import { LanguageMenu } from '@/features/shell/components/LanguageMenu'
import { useMembership } from '@/features/subscription/hooks/useMembership'
import { membershipView, MEMBERSHIP_STATE } from '@/features/subscription/lib/membership'
import { usePushPreferences } from '@/features/notifications/hooks/usePushPreferences'
import { useProfile } from '../hooks/useProfile'
import { vehIconKeyOf } from '../lib/profileForm'
import { CompletenessBanner } from './CompletenessBanner'
import { VerificationCards } from './VerificationCards'
import { AppPermsSheet } from './AppPermsSheet'
import { DeleteAccountButton } from './DeleteAccountButton'

/** Support deep-link — WhatsApp when configured, else email (mirrors shell SupportButton). */
function supportHref() {
  return env.NEXT_PUBLIC_SUPPORT_WHATSAPP ? `https://wa.me/${env.NEXT_PUBLIC_SUPPORT_WHATSAPP}` : `mailto:${env.NEXT_PUBLIC_SUPPORT_EMAIL}`
}

function Stat({ icon, label, value, onEdit }) {
  return (
    <button type="button" onClick={onEdit} className="flex flex-col items-center gap-1.5 px-2 py-4 text-center">
      <span className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-ec-sky text-ec-blue">{icon}</span>
      <span className="text-[11px] font-semibold text-ec-ink60">{label}</span>
      <span className="flex items-center justify-center gap-1 truncate text-[14px] font-extrabold text-ec-ink">{value}<span className="inline-flex text-ec-ink40"><Pencil size={11} /></span></span>
    </button>
  )
}

function NavRow({ icon, tint, label, value, valueTint, onClick, last }) {
  return (
    <button type="button" onClick={onClick} className={`flex w-full items-center gap-3 px-4 py-3.5 text-left ${last ? '' : 'border-b border-ec-line'}`}>
      <span className={`flex h-9 w-9 items-center justify-center rounded-full bg-ec-sky ${tint || 'text-ec-blue'}`}>{icon}</span>
      <span className="flex-1 text-[14px] font-bold text-ec-ink">{label}</span>
      {value && <span className={`text-[12.5px] font-bold ${valueTint || 'text-ec-ink60'}`}>{value}</span>}
      <ChevR size={16} className="text-ec-ink40" />
    </button>
  )
}

/** Profile hub (SCREENS §6 / profile.jsx) — header card, stats, about, verification, nav, danger logout. */
export function ProfileScreen() {
  const t = useTranslations('profile')
  const locale = useLocale()
  const router = useRouter()
  const [permsOpen, setPermsOpen] = useState(false)
  const { data: profile, isLoading, isError } = useProfile()
  const { data: sub } = useMembership()
  // Subscribed alert-city count for the Notifications row (P12-6); 0 → no value shown.
  const { prefs: pushPrefs } = usePushPreferences()
  const alertCityCount = pushPrefs?.notificationCities?.length ?? 0

  if (isLoading) return <div className="flex flex-1 items-center justify-center text-ec-ink40">…</div>
  if (isError || !profile) return <div className="flex flex-1 items-center justify-center px-6 text-center text-[14px] font-semibold text-ec-danger">{t('error.load')}</div>

  const v = profile.verification
  const phone = `+91 ${String(profile.phone).replace(/^\+91/, '')}`
  const goEdit = () => router.push('/profile/edit')

  // Membership row value + tint (mockup profile.jsx) — only once the status loads,
  // so we never flash a misleading "Expired" while the query is in flight.
  const mv = sub ? membershipView(sub) : null
  const memValue = mv && (mv.state === MEMBERSHIP_STATE.TRIAL
    ? t('nav.membershipValue.trial', { days: mv.daysLeft ?? 0 })
    : t(`nav.membershipValue.${mv.state}`))
  const memTint = mv && (mv.state === MEMBERSHIP_STATE.EXPIRED ? 'text-ec-danger'
    : mv.state === MEMBERSHIP_STATE.ACTIVE ? 'text-ec-successTx' : 'text-ec-warning')

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-ec-bg p-4">
      {/* Header card — tap anywhere to edit */}
      <button type="button" onClick={goEdit} className="flex items-center gap-3.5 rounded-2xl border border-ec-line bg-white p-4 text-left shadow-ec-card">
        {profile.profilePicUrl ? (
          <img src={profile.profilePicUrl} alt="" className="h-16 w-16 shrink-0 rounded-full border-2 border-ec-sky object-cover" />
        ) : (
          <span className="flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-full border-2 border-dashed border-ec-blue/40 bg-ec-sky text-ec-blue">
            <Plus size={18} /><span className="text-[8.5px] font-extrabold">{t('header.addPhoto')}</span>
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[18px] font-extrabold text-ec-ink">{profile.name || '—'}</span>
            {v.aadhaarVerified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-ec-successBg px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-ec-successTx">
                <Shield size={12} className="text-ec-success" />{t('verifiedBadge')}
              </span>
            )}
          </span>
          <span className="mt-0.5 block text-[13px] font-semibold text-ec-ink60">{[profile.baseCity, t('header.driver')].filter(Boolean).join(' · ')}</span>
          <span className="block text-[12.5px] font-semibold text-ec-ink40">{phone}</span>
        </span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-ec-bg text-ec-ink60"><Pencil size={17} /></span>
      </button>

      {!profile.profileComplete && <CompletenessBanner onAction={() => (v.aadhaarVerified ? goEdit() : router.push('/verify?intent=l1'))} />}

      {/* Stats grid — tap to edit */}
      <div>
        <div className="grid grid-cols-3 divide-x divide-ec-line overflow-hidden rounded-2xl border border-ec-line bg-white shadow-ec-card">
          <Stat icon={<Steer size={16} />} label={t('stats.experience')} value={profile.experience != null ? `${profile.experience} ${t('stats.years')}` : '—'} onEdit={goEdit} />
          <Stat icon={<Pin size={15} />} label={t('stats.workingCity')} value={profile.workingCity || profile.baseCity || '—'} onEdit={goEdit} />
          <Stat icon={<VehicleIcon vehicleKey={vehIconKeyOf(profile.vehicleType)} size={16} />} label={t('stats.vehicle')} value={profile.vehicleType || '—'} onEdit={goEdit} />
        </div>
        <p className="mt-1.5 text-center text-[11px] font-semibold text-ec-ink40">{t('stats.tapHint')}</p>
      </div>

      {/* About + languages */}
      <section className="rounded-2xl border border-ec-line bg-white p-4 shadow-ec-card">
        <div className="flex items-center justify-between">
          <p className="text-[12.5px] font-extrabold uppercase tracking-wide text-ec-ink60">{t('about.title')}</p>
          <button type="button" onClick={goEdit} className="inline-flex items-center gap-1 text-[12.5px] font-bold text-ec-blue"><Pencil size={13} />{t('about.edit')}</button>
        </div>
        <p className="mt-2 text-[13.5px] font-medium leading-relaxed text-ec-ink">{profile.bio || t('about.empty')}</p>
        {profile.languagesSpoken.length > 0 && (
          <>
            <p className="mb-1.5 mt-3 text-[11.5px] font-bold text-ec-ink40">{t('about.languages')}</p>
            <div className="flex flex-wrap gap-2">
              {profile.languagesSpoken.map((l) => (
                <span key={l} className="rounded-full bg-ec-sky px-2.5 py-1 text-[12px] font-bold text-ec-blueInk">{l}</span>
              ))}
            </div>
          </>
        )}
      </section>

      <VerificationCards
        verification={v}
        onStartL1={() => router.push('/verify?intent=l1')}
        onStartL2={() => router.push('/verify?intent=driver')}
      />

      {/* Options — inline rows per mockup profile.jsx (Membership · Notifications · Language).
          Language hosts the existing LanguageMenu dropdown so the row isn't a nested button. */}
      <nav className="overflow-hidden rounded-2xl border border-ec-line bg-white shadow-ec-card">
        <NavRow icon={<Crown size={18} />} label={t('nav.membership')} value={memValue} valueTint={memTint} onClick={() => router.push('/membership')} />
        <NavRow icon={<BellEdit size={18} />} label={t('nav.notifications')} value={alertCityCount > 0 ? t('nav.notificationsCount', { count: alertCityCount }) : undefined} onClick={() => router.push('/notifications')} />
        <div className="flex w-full items-center gap-3 px-4 py-3.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ec-sky text-ec-blue"><Globe size={18} /></span>
          <span className="flex-1 text-[14px] font-bold text-ec-ink">{t('nav.language')}</span>
          <LanguageMenu current={locale} />
        </div>
      </nav>

      <nav className="overflow-hidden rounded-2xl border border-ec-line bg-white shadow-ec-card">
        <NavRow icon={<Lock size={16} />} tint="text-ec-amberTx" label={t('nav.appPermissions')} onClick={() => setPermsOpen(true)} />
        <NavRow icon={<Info size={16} />} tint="text-ec-ink60" label={t('nav.privacy')} onClick={() => router.push('/privacy-policy')} />
        <NavRow icon={<List size={18} />} tint="text-ec-ink60" label={t('nav.terms')} onClick={() => router.push('/terms')} last />
      </nav>

      <a href={supportHref()} target="_blank" rel="noopener noreferrer" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-ec-line bg-white text-[14.5px] font-extrabold text-ec-blueInk shadow-ec-card">
        <Headset size={18} />{t('support')}
      </a>

      <LogoutButton variant="danger" />
      <DeleteAccountButton />
      <p className="pb-2 text-center text-[11px] font-semibold text-ec-ink40">{t('version')}</p>

      {permsOpen && <AppPermsSheet onClose={() => setPermsOpen(false)} />}
    </div>
  )
}
