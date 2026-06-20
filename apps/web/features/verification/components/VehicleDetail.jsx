'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { OverlayHeader } from '@/components/ui/Overlay'
import { Car, List, Shield, Lock, Check } from '@/components/ui/icons'
import { DocStatusBadge } from './DocStatusBadge'
import { docState } from '../lib/verifyView'

/**
 * Read-only vehicle/RC record (mockup vehicle.jsx VehicleDetailScreen) — HONEST THIN
 * version. The full RC (owner, fuel, body type, age, registration authority/date) is
 * verified against VAHAN but never stored (§10); we hold only make, model, registration
 * and RC status. The privacy note states the omission instead of faking an RC record.
 */
export function VehicleDetail({ profile }) {
  const t = useTranslations('verification')
  const tc = useTranslations('common')
  const router = useRouter()
  const v = profile?.verification ?? {}
  const make = [v.carMake, v.carModel].filter(Boolean).join(' ') || '—'
  const reg = v.carRegNo || '—'
  const type = profile?.vehicleType || '—'

  const rows = [
    [Car, t('detail.vehicleLabel'), make],
    [List, t('detail.regLabel'), reg],
    [Shield, t('detail.typeLabel'), type],
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-ec-bg">
      <OverlayHeader title={t('detail.vehicleTitle')} onBack={() => router.push('/verify?intent=driver')} backLabel={tc('actions.back')} />
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        <p className="text-[14px] font-extrabold text-ec-ink">{t('detail.onlyYou')}</p>

        {/* hero */}
        <div className="rounded-2xl bg-ec-blueInk px-4 py-5 text-center">
          <span className="inline-flex text-white"><Car size={34} /></span>
          <p className="mt-1.5 text-[19px] font-extrabold text-white">{make}</p>
          <p className="mt-0.5 text-[14px] font-bold tracking-[0.06em] text-white/90">{reg}</p>
        </div>

        {/* what we hold */}
        <div className="rounded-2xl border border-ec-line bg-white px-4 shadow-ec-card">
          {rows.map(([Icon, k, val], i) => (
            <div key={k} className={`flex items-center gap-3 py-3.5 ${i < rows.length - 1 ? 'border-b border-ec-line' : ''}`}>
              <span className="inline-flex shrink-0 text-ec-blue"><Icon size={18} /></span>
              <span className="flex-1 text-[14px] font-bold text-ec-ink">{k}</span>
              <span className="max-w-[52%] truncate text-right text-[13.5px] font-extrabold text-ec-ink60">{val}</span>
            </div>
          ))}
        </div>

        {/* RC status */}
        <div className="flex items-center gap-3.5 rounded-2xl border border-ec-line bg-white p-4 shadow-ec-card">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ec-sky text-ec-blue"><Check size={22} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-bold text-ec-ink60">{t('detail.rcStatus')}</p>
            <p className="truncate text-[15.5px] font-extrabold text-ec-ink">{t('driver.rcTitle')}</p>
          </div>
          <DocStatusBadge stateKey={docState(v.rcSubmitted)} />
        </div>

        <div className="flex items-start gap-2.5 rounded-2xl bg-ec-sky px-4 py-3.5">
          <span className="mt-0.5 inline-flex shrink-0 text-ec-blue"><Lock size={15} /></span>
          <p className="text-[12.5px] font-semibold leading-relaxed text-ec-blueInk">{t('detail.rcPrivacyNote')}</p>
        </div>
      </div>

      <div className="shrink-0 border-t border-ec-line bg-white p-3.5">
        <button type="button" onClick={() => router.push('/verify?intent=rc')} className="h-[52px] w-full rounded-xl bg-ec-blueInk text-[15.5px] font-extrabold text-white">{t('detail.verifyAgain')}</button>
      </div>
    </div>
  )
}
