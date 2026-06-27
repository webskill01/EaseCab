'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { OverlayHeader } from '@/components/ui/Overlay'
import { Button } from '@/components/ui/button'
import { Shield, List, Car, User, Globe, Pin, Check, ChevR, Headset } from '@/components/ui/icons'
import { env } from '@/config/env'
import { useProfile } from '@/features/profile/hooks/useProfile'

// Per-doc lifecycle (mirrors the API verification block). approved|submitted both count
// toward completion %; rejected drops it back; none = not started.
const VS = { NONE: 'none', SUBMITTED: 'submitted', APPROVED: 'approved', REJECTED: 'rejected' }
const counts = (s) => s === VS.APPROVED || s === VS.SUBMITTED

/** Support deep-link — WhatsApp when configured, else email (mirrors ProfileScreen). */
function supportHref() {
  return env.NEXT_PUBLIC_SUPPORT_WHATSAPP ? `https://wa.me/${env.NEXT_PUBLIC_SUPPORT_WHATSAPP}` : `mailto:${env.NEXT_PUBLIC_SUPPORT_EMAIL}`
}

/** Trailing state: green check (approved), amber Pending pill (submitted), red Rejected
 * pill (rejected), or a forward chevron (not started). */
function StateBadge({ state, t }) {
  if (state === VS.APPROVED) {
    return <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ec-success text-white"><Check size={17} /></span>
  }
  if (state === VS.SUBMITTED) {
    return <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-ec-warnBg px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-ec-amberTx"><span className="h-1.5 w-1.5 rounded-full bg-ec-warning" />{t('center.pending')}</span>
  }
  if (state === VS.REJECTED) {
    return <span className="inline-flex shrink-0 items-center rounded-full bg-ec-dangerBg px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-ec-danger">{t('center.rejected')}</span>
  }
  return <span className="inline-flex shrink-0 text-ec-ink"><ChevR size={20} /></span>
}

/** One option row: sky tile (red when rejected), icon + title + state badge, and the
 * admin's rejection reason underneath when present. */
function EVRow({ icon, title, state, reason, onClick, t }) {
  const rejected = state === VS.REJECTED
  return (
    <div className="mb-2.5">
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-center gap-3 rounded-[13px] border-[1.5px] px-3.5 py-3.5 text-left ${rejected ? 'border-ec-danger/40 bg-ec-dangerBg' : 'border-ec-blue/30 bg-ec-sky'}`}
      >
        <span className="inline-flex shrink-0 text-ec-ink">{icon}</span>
        <span className="min-w-0 flex-1 text-[15px] font-extrabold text-ec-ink">{title}</span>
        <StateBadge state={state} t={t} />
      </button>
      {rejected && reason && (
        <p className="mt-1 px-1 text-[12px] font-semibold text-ec-danger">{t('center.reasonLabel', { reason })}</p>
      )}
    </div>
  )
}

/** Centered section divider with a label between two rules (mockup SectionLabel). */
function SectionLabel({ children }) {
  return (
    <div className="mb-3 mt-[18px] flex items-center gap-2.5">
      <div className="h-px flex-1 bg-ec-ink/80" />
      <span className="text-[14px] font-extrabold text-ec-ink">{children}</span>
      <div className="h-px flex-1 bg-ec-ink/80" />
    </div>
  )
}

/**
 * "Edit & Verify center" (mockup verification.jsx VerifyScreen) — data-backed completion
 * card + two grouped option lists. Each DL/RC row shows its real lifecycle (none →
 * submitted → approved | rejected): submitted/approved count toward the %, a rejection
 * drops it and surfaces the admin's reason + routes back to re-submit. Identity rows open
 * the verified (honest-thin) detail pages; profile rows open the edit form.
 */
export function EditVerifyCenter() {
  const t = useTranslations('verification')
  const tc = useTranslations('common')
  const router = useRouter()
  const { data: profile, isLoading, isError } = useProfile()

  if (isLoading) return <div className="flex flex-1 items-center justify-center text-ec-ink40">…</div>
  if (isError || !profile) {
    return <div className="flex flex-1 items-center justify-center px-6 text-center text-[14px] font-semibold text-ec-danger">{t('errors.generic')}</div>
  }

  const v = profile.verification ?? {}
  const dl = v.dl ?? { status: v.dlSubmitted ? VS.SUBMITTED : VS.NONE, rejectionReason: null }
  const rc = v.rc ?? { status: v.rcSubmitted ? VS.SUBMITTED : VS.NONE, rejectionReason: null }
  const goEdit = () => router.push('/profile/edit')
  // A doc row that's not yet verified (none/rejected) routes to its verify page to
  // (re)submit; submitted/approved open the read-only detail page.
  const docOpen = (status) => status === VS.NONE || status === VS.REJECTED

  const identity = [
    { key: 'aadhaar', icon: <Shield size={22} />, title: t('center.rowAadhaar'), state: v.aadhaarVerified ? VS.APPROVED : VS.NONE,
      onClick: () => router.push(v.aadhaarVerified ? '/verify?intent=aadhaar-detail' : '/verify?intent=l1') },
    { key: 'dl', icon: <List size={22} />, title: t('center.rowDl'), state: dl.status, reason: dl.rejectionReason,
      onClick: () => router.push(docOpen(dl.status) ? '/verify?intent=dl' : '/verify?intent=dl-detail') },
    { key: 'rc', icon: <Car size={22} />, title: t('center.rowRc'), state: rc.status, reason: rc.rejectionReason,
      onClick: () => router.push(docOpen(rc.status) ? '/verify?intent=rc' : '/verify?intent=rc-detail') },
  ]
  const details = [
    { key: 'profile', icon: <User size={22} />, title: t('center.rowProfile'), state: profile.profileComplete ? VS.APPROVED : VS.NONE, onClick: goEdit },
    { key: 'languages', icon: <Globe size={20} />, title: t('center.rowLanguages'), state: (profile.languagesSpoken?.length ?? 0) > 0 ? VS.APPROVED : VS.NONE, onClick: goEdit },
    { key: 'workingCity', icon: <Pin size={20} />, title: t('center.rowWorkingCity'), state: (profile.workingCity || profile.baseCity) ? VS.APPROVED : VS.NONE, onClick: goEdit },
  ]
  const allRows = [...identity, ...details]
  const doneCount = allRows.filter((r) => counts(r.state)).length
  const pct = Math.round((doneCount / allRows.length) * 100)
  const hasRejected = allRows.some((r) => r.state === VS.REJECTED)
  const note = hasRejected ? t('center.rejectedNote') : pct === 100 ? t('center.allDone') : t('center.addPhotoNote')

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-ec-bg">
      <OverlayHeader title={t('center.header')} onBack={() => router.push('/profile')} backLabel={tc('actions.back')} />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 pb-6">
        {/* completion card */}
        <div className="rounded-2xl border border-ec-line bg-white p-4 shadow-ec-card">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-[14.5px] font-extrabold text-ec-ink">{t('center.completion')}</span>
            <span className="text-[17px] font-extrabold text-ec-blueInk">{pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-ec-line">
            <div className="h-full rounded-full bg-ec-blue transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
          <p className={`mt-2.5 text-[12px] font-semibold leading-snug ${hasRejected ? 'text-ec-danger' : 'text-ec-ink60'}`}>{note}</p>
        </div>

        <SectionLabel>{t('center.identitySection')}</SectionLabel>
        {identity.map((r) => (
          <EVRow key={r.key} icon={r.icon} title={r.title} state={r.state} reason={r.reason} onClick={r.onClick} t={t} />
        ))}

        <SectionLabel>{t('center.profileSection')}</SectionLabel>
        {details.map((r) => (
          <EVRow key={r.key} icon={r.icon} title={r.title} state={r.state} onClick={r.onClick} t={t} />
        ))}

        {!profile.profileComplete && (
          <Button type="button" size="lg" onClick={goEdit} className="mt-1.5 w-full">
            {t('center.addPhotoCta')}
          </Button>
        )}

        <Button asChild variant="outline" size="lg" className="mt-4 w-full text-ec-blueInk shadow-ec-card">
          <a href={supportHref()} target="_blank" rel="noopener noreferrer"><Headset size={19} />{t('center.help')}</a>
        </Button>
      </div>
    </div>
  )
}
