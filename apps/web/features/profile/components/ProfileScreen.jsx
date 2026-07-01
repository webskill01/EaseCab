'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Shield, Crown, BellEdit, ChevR, Pin, Plus, Pencil, Headset, VehicleIcon, Info, List, Globe, Lock, Ban, Bolt } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { env } from '@/config/env'
import { LOCALE_NAMES } from '@/i18n/config'
import { useMembership } from '@/features/subscription/hooks/useMembership'
import { membershipView, MEMBERSHIP_STATE } from '@/features/subscription/lib/membership'
import { usePushPreferences } from '@/features/notifications/hooks/usePushPreferences'
import { useProfile } from '../hooks/useProfile'
import { vehIconKeyOf } from '../lib/profileForm'
import { CompletenessBanner } from './CompletenessBanner'
import { AppPermsSheet } from './AppPermsSheet'
import { AccountActionsCard } from './AccountActionsCard'

/** Support deep-link — WhatsApp when configured, else email (mirrors shell SupportButton). */
function supportHref() {
  return env.NEXT_PUBLIC_SUPPORT_WHATSAPP ? `https://wa.me/${env.NEXT_PUBLIC_SUPPORT_WHATSAPP}` : `mailto:${env.NEXT_PUBLIC_SUPPORT_EMAIL}`
}

/** Settings-row icon-tile tints (handoff §1.1 — tint at ~10% bg, solid fg). */
const TILE = {
  blue: 'bg-ec-blue/10 text-ec-blue',
  success: 'bg-ec-success/10 text-ec-success',
  warning: 'bg-ec-warning/10 text-ec-warning',
  danger: 'bg-ec-danger/10 text-ec-danger',
  ink: 'bg-ec-ink60/10 text-ec-ink60',
}

function Stat({ icon, label, value, onEdit }) {
  return (
    <button type="button" onClick={onEdit} className="flex flex-col items-center gap-1.5 px-2 py-4 text-center">
      <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-ec-sky text-ec-blue">{icon}</span>
      <span className="text-[11px] font-semibold text-ec-ink60">{label}</span>
      <span className="flex items-center justify-center gap-1 truncate text-[14.5px] font-extrabold text-ec-ink">{value}<span className="inline-flex text-ec-ink40"><Pencil size={11} /></span></span>
    </button>
  )
}

/** Settings row (handoff §3⑤ Row): r10 tinted icon tile, title, optional value, chevron. */
function NavRow({ icon, tone = 'blue', label, value, valueTint, onClick, last }) {
  return (
    <button type="button" onClick={onClick} className={`flex w-full items-center gap-3 px-4 py-3.5 text-left ${last ? '' : 'border-b border-ec-line'}`}>
      <span className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] ${TILE[tone]}`}>{icon}</span>
      <span className="flex-1 text-[14.5px] font-bold text-ec-ink">{label}</span>
      {value && <span className={`text-[13px] font-bold ${valueTint || 'text-ec-ink60'}`}>{value}</span>}
      <ChevR size={18} className="shrink-0 text-ec-ink40" />
    </button>
  )
}

/** Profile hub (handoff §2/§3) — header, banner, stats, about, two settings groups, support, danger. */
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

  // Restore scroll on return (open a row → route away → Back): the screen remounts and
  // would otherwise jump to the top. Persist scrollTop per-scroll, restore once the
  // profile has loaded and the scroll container exists. ponytail: sessionStorage, not a
  // router-cache scroll manager — the app router resets scroll on every navigation.
  const scrollRef = useRef(null)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const saved = sessionStorage.getItem('ec:profileScroll')
    if (saved) el.scrollTop = Number(saved)
    const onScroll = () => sessionStorage.setItem('ec:profileScroll', String(el.scrollTop))
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [profile])

  if (isLoading) return <div className="flex flex-1 items-center justify-center text-ec-ink40">…</div>
  if (isError || !profile) return <div className="flex flex-1 items-center justify-center px-6 text-center text-[14px] font-semibold text-ec-danger">{t('error.load')}</div>

  const v = profile.verification
  const phone = `+91 ${String(profile.phone).replace(/^\+91/, '')}`
  const goEdit = () => router.push('/profile/edit')

  // Membership row value + tint (handoff §3⑤) — only once the status loads, so we
  // never flash a misleading "Expired" while the query is in flight.
  const mv = sub ? membershipView(sub) : null
  const memValue = mv && (mv.state === MEMBERSHIP_STATE.TRIAL
    ? t('nav.membershipValue.trial', { days: mv.daysLeft ?? 0 })
    : t(`nav.membershipValue.${mv.state}`))
  const memTone = mv && (mv.state === MEMBERSHIP_STATE.EXPIRED ? 'danger'
    : mv.state === MEMBERSHIP_STATE.ACTIVE ? 'success' : 'warning')
  const memTint = memTone && (memTone === 'danger' ? 'text-ec-danger' : memTone === 'success' ? 'text-ec-successTx' : 'text-ec-warning')

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-ec-bg p-4">
      {/* ① Header card — tap anywhere to edit */}
      <button type="button" onClick={goEdit} className="flex w-full items-center gap-3.5 rounded-2xl border border-ec-line bg-white p-4 text-left shadow-ec-card">
        {profile.profilePicUrl ? (
          <img src={profile.profilePicUrl} alt="" className="h-[62px] w-[62px] shrink-0 rounded-full border-2 border-ec-sky object-cover" />
        ) : (
          <span className="flex h-[62px] w-[62px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-full border-2 border-dashed border-ec-blue/40 bg-ec-sky text-ec-blue">
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
        <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-ec-bg text-ec-ink60"><Pencil size={17} /></span>
      </button>

      {/* ② Complete-profile banner */}
      {!profile.profileComplete && <CompletenessBanner onAction={() => (v.aadhaarVerified ? goEdit() : router.push('/verify?intent=l1'))} />}

      {/* ③ Stats grid — tap to edit */}
      <div>
        <div className="grid grid-cols-3 divide-x divide-ec-line overflow-hidden rounded-2xl border border-ec-line bg-white shadow-ec-card">
          <Stat icon={<Bolt size={16} />} label={t('stats.experience')} value={profile.experience != null ? `${profile.experience} ${t('stats.years')}` : '—'} onEdit={goEdit} />
          <Stat icon={<Pin size={15} />} label={t('stats.workingCity')} value={profile.workingCity || profile.baseCity || '—'} onEdit={goEdit} />
          <Stat icon={<VehicleIcon vehicleKey={vehIconKeyOf(profile.vehicleType)} size={16} />} label={t('stats.vehicle')} value={profile.vehicleType || '—'} onEdit={goEdit} />
        </div>
        <p className="mt-1.5 text-center text-[11px] font-semibold text-ec-ink40">{t('stats.tapHint')}</p>
      </div>

      {/* ④ About + languages */}
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

      {/* ⑤ Settings group A */}
      <nav className="overflow-hidden rounded-2xl border border-ec-line bg-white shadow-ec-card">
        <NavRow icon={<Shield size={18} />} tone="success" label={t('nav.verification')}
          value={profile.profileComplete ? t('status.verified') : t('status.pending')}
          valueTint={profile.profileComplete ? 'text-ec-successTx' : 'text-ec-warning'}
          onClick={() => router.push('/verify?intent=driver')} />
        <NavRow icon={<Pencil size={16} />} tone="blue" label={t('nav.editReverify')} value={t('edit')} onClick={() => router.push('/verify?intent=center')} />
        <NavRow icon={<Crown size={16} />} tone={memTone || 'warning'} label={t('nav.membership')} value={memValue} valueTint={memTint} onClick={() => router.push('/membership')} />
        <NavRow icon={<BellEdit size={18} />} tone="blue" label={t('nav.notifications')} value={alertCityCount > 0 ? t('nav.notificationsCount', { count: alertCityCount }) : undefined} onClick={() => router.push('/notifications')} />
        <NavRow icon={<Globe size={18} />} tone="blue" label={t('nav.language')} value={LOCALE_NAMES[locale] ?? locale} onClick={() => router.push('/profile/language')} last />
      </nav>

      {/* ⑥ Settings group B */}
      <nav className="overflow-hidden rounded-2xl border border-ec-line bg-white shadow-ec-card">
        <NavRow icon={<Lock size={16} />} tone="warning" label={t('nav.appPermissions')} onClick={() => setPermsOpen(true)} />
        <NavRow icon={<Ban size={16} />} tone="ink" label={t('nav.blocked')} onClick={() => router.push('/profile/blocked')} />
        {/* Legal pages live in the public (legal) layout outside AuthGuard; navigating
            there in-app and back bounces through the root → /login redirect. Open them
            in a new tab so the authed session is never left. */}
        <NavRow icon={<Info size={16} />} tone="ink" label={t('nav.privacy')} onClick={() => window.open('/privacy-policy', '_blank', 'noopener')} />
        <NavRow icon={<List size={18} />} tone="ink" label={t('nav.terms')} onClick={() => window.open('/terms', '_blank', 'noopener')} last />
      </nav>

      {/* ⑦ Support */}
      <Button asChild variant="outline" size="lg" className="w-full text-[14.5px] text-ec-blueInk shadow-ec-card">
        <a href={supportHref()} target="_blank" rel="noopener noreferrer"><Headset size={18} />{t('support')}</a>
      </Button>

      {/* ⑧ Account actions — one two-row danger card (logout + delete) */}
      <AccountActionsCard />

      {/* ⑨ Version footer */}
      <p className="pb-2 text-center text-[11px] font-semibold text-ec-ink40">{t('version')}</p>

      {permsOpen && <AppPermsSheet onClose={() => setPermsOpen(false)} />}
    </div>
  )
}
