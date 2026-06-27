'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { OverlayHeader } from '@/components/ui/Overlay'
import { Button } from '@/components/ui/button'
import { Check, Shield, Lock } from '@/components/ui/icons'
import { maskAadhaar } from '../lib/verifyView'

/**
 * Read-only Aadhaar record (mockup verification.jsx AadhaarDetailScreen) — HONEST THIN
 * version. We deliberately never store Aadhaar demographics (§10), so this shows only
 * what we hold: the verified name, masked last-4, and verified status. The privacy note
 * makes the omission explicit rather than faking a demographic record.
 */
export function AadhaarDetail({ profile }) {
  const t = useTranslations('verification')
  const tc = useTranslations('common')
  const router = useRouter()
  const v = profile?.verification ?? {}
  const name = profile?.name || '—'

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-ec-bg">
      <OverlayHeader title={t('timeline.aadhaar')} onBack={() => router.push('/verify?intent=driver')} backLabel={tc('actions.back')} />
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        <p className="text-[14px] font-extrabold text-ec-ink">{t('detail.onlyYou')}</p>

        {/* identity card */}
        <div className="flex items-center gap-3.5 rounded-2xl border border-ec-line bg-white p-4 shadow-ec-card">
          <span className="flex h-[62px] w-[62px] shrink-0 items-center justify-center rounded-full bg-ec-sky text-[24px] font-extrabold text-ec-blue">{name.slice(0, 1).toUpperCase()}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[17px] font-extrabold leading-tight text-ec-ink">{name}</p>
            <p className="mt-1 inline-flex items-center gap-1 text-[12.5px] font-bold text-ec-successTx"><Check size={14} />{t('detail.statusVerified')}</p>
          </div>
          <span className="inline-flex shrink-0 text-ec-success"><Shield size={30} /></span>
        </div>

        {/* masked number */}
        <div className="rounded-2xl border border-ec-line bg-white px-4 shadow-ec-card">
          <div className="flex items-center justify-between py-3.5">
            <span className="text-[13.5px] font-bold text-ec-ink60">{t('detail.aadhaarNumber')}</span>
            <span className="text-[14px] font-extrabold tracking-[0.1em] text-ec-ink">{maskAadhaar(v.aadhaarLast4)}</span>
          </div>
        </div>

        <div className="flex items-start gap-2.5 rounded-2xl bg-ec-sky px-4 py-3.5">
          <span className="mt-0.5 inline-flex shrink-0 text-ec-blue"><Lock size={15} /></span>
          <p className="text-[12.5px] font-semibold leading-relaxed text-ec-blueInk">{t('detail.privacyNote')}</p>
        </div>
      </div>

      <div className="shrink-0 border-t border-ec-line bg-white p-3.5">
        <Button type="button" size="lg" onClick={() => router.push('/verify?intent=aadhaar-reverify')} className="w-full">{t('detail.verifyAgain')}</Button>
      </div>
    </div>
  )
}
