'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ChevronLeft, Shield, Pin, Steer, VehicleIcon, Globe, List, User, Flag } from '@/components/ui/icons'
import { vehIconKeyOf } from '../lib/profileForm'
import { usePosterProfile } from '../hooks/usePosterProfile'
import { useProfile } from '../hooks/useProfile'
import { ReportUserSheet } from './ReportUserSheet'

// `i` drives per-cell borders (right except last column, top from the 2nd row) — a 2-row
// grid can't use Tailwind `divide-*` cleanly (its sibling selectors break across rows).
function Stat({ icon, label, value, i }) {
  return (
    <div className={`flex min-w-0 flex-col items-center gap-1.5 px-2 py-4 text-center ${i % 3 !== 2 ? 'border-r border-ec-line' : ''} ${i >= 3 ? 'border-t border-ec-line' : ''}`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-ec-sky text-ec-blue">{icon}</span>
      <span className="text-[11px] font-semibold text-ec-ink60">{label}</span>
      <span className="w-full truncate text-[14px] font-extrabold text-ec-ink">{value}</span>
    </div>
  )
}

/**
 * Public poster profile (T3-2, /u/[id]) — read-only view of another driver opened by
 * tapping them (e.g. from a chat header). Hero + stats grid + about. No phone/contact
 * action here: contacting lives in its own gated context (ride card / chat composer).
 */
export function PosterProfileScreen({ userId }) {
  const t = useTranslations('profile')
  const router = useRouter()
  const [reportOpen, setReportOpen] = useState(false)
  const { data: p, isLoading, isError } = usePosterProfile(userId)
  // You can't report yourself — hide the action on your own profile (the server also
  // rejects it). `me` may not be loaded yet; default to hiding nothing until it is.
  const { data: me } = useProfile()
  const isSelf = me?.id === userId

  // `showReport` only on the loaded profile — there's nothing to report while loading/erroring.
  const header = (showReport = false) => (
    <header className="flex items-center gap-2.5 border-b border-ec-line bg-white px-3 py-2.5">
      <button type="button" onClick={() => router.back()} aria-label={t('poster.back')} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ec-ink">
        <ChevronLeft size={24} />
      </button>
      <span className="flex-1 text-[15px] font-extrabold text-ec-ink">{t('poster.title')}</span>
      {showReport && (
        <button type="button" onClick={() => setReportOpen(true)} aria-label={t('poster.report.flag')} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ec-danger">
          <Flag size={19} />
        </button>
      )}
    </header>
  )
  const back = header(false)

  if (isLoading) return <div className="flex h-full flex-col bg-ec-bg">{back}<div className="flex flex-1 items-center justify-center text-ec-ink40">…</div></div>
  if (isError || !p) return <div className="flex h-full flex-col bg-ec-bg">{back}<div className="flex flex-1 items-center justify-center px-6 text-center text-[14px] font-semibold text-ec-danger">{t('poster.error')}</div></div>

  const v = p.verification
  const statusLabel = (ok) => t(ok ? 'poster.status.verified' : 'poster.status.pending')
  const firstName = (p.name || '').split(' ')[0]

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-ec-bg">
      {header(!isSelf)}
      {reportOpen && <ReportUserSheet userId={userId} onClose={() => setReportOpen(false)} />}
      {/* Hero */}
      <div className="relative bg-ec-blueInk px-4 pb-12 pt-7 text-center">
        {p.profilePicUrl ? (
          <img src={p.profilePicUrl} alt="" className="mx-auto h-[92px] w-[92px] rounded-full border-2 border-ec-blue object-cover" />
        ) : (
          <span className="mx-auto flex h-[92px] w-[92px] items-center justify-center rounded-full bg-ec-blue text-white"><User size={40} /></span>
        )}
        <div className="mt-3 text-[20px] font-extrabold text-white">{p.name || '—'}</div>
        {p.baseCity && (
          <div className="mt-1 flex items-center justify-center gap-1.5 text-[13px] font-semibold text-ec-sky"><Pin size={14} />{p.baseCity}</div>
        )}
        {p.verifiedDriver && (
          <span className="mt-2.5 inline-flex h-[26px] items-center gap-1.5 rounded-full bg-white px-3 text-[11.5px] font-extrabold uppercase tracking-wide text-ec-successTx">
            <Shield size={14} className="text-ec-success" />{t('poster.verifiedDriver')}
          </span>
        )}
      </div>

      <div className="relative z-10 -mt-7 px-4 pb-4">
        {/* Stats */}
        <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-ec-line bg-white shadow-ec-card">
          <Stat i={0} icon={<Steer size={16} />} label={t('stats.experience')} value={p.experience != null ? `${p.experience} ${t('stats.years')}` : '—'} />
          <Stat i={1} icon={<Pin size={15} />} label={t('poster.stats.baseCity')} value={p.baseCity || '—'} />
          <Stat i={2} icon={<VehicleIcon vehicleKey={vehIconKeyOf(p.vehicleType)} size={16} />} label={t('stats.vehicle')} value={p.vehicleType || '—'} />
          <Stat i={3} icon={<Shield size={15} />} label={t('poster.stats.aadhaar')} value={statusLabel(v.aadhaarVerified)} />
          <Stat i={4} icon={<List size={15} />} label={t('poster.stats.license')} value={statusLabel(v.dlSubmitted)} />
          <Stat i={5} icon={<Globe size={15} />} label={t('poster.stats.languages')} value={String(p.languagesSpoken.length)} />
        </div>

        {/* About */}
        <section className="mt-3.5 rounded-2xl border border-ec-line bg-white p-4 shadow-ec-card">
          <p className="text-[12.5px] font-extrabold uppercase tracking-wide text-ec-ink60">{t('poster.about', { name: firstName })}</p>
          <p className="mt-2 text-[13.5px] font-medium leading-relaxed text-ec-ink">{p.bio || t('poster.aboutEmpty')}</p>
          {p.languagesSpoken.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {p.languagesSpoken.map((l) => (
                <span key={l} className="rounded-full bg-ec-sky px-2.5 py-1 text-[12px] font-bold text-ec-blueInk">{l}</span>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
