'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { OverlayHeader } from '@/components/ui/Overlay'
import { Button } from '@/components/ui/button'
import { List, Lock } from '@/components/ui/icons'
import { DocStatusBadge } from './DocStatusBadge'
import { docState } from '../lib/verifyView'

/**
 * Read-only Driving-Licence record (mockup verification.jsx DLDetailScreen) — HONEST
 * THIN version. DL number/validity/coverage are verified against the RTO but never
 * stored (§10); we hold only the holder name + submitted/verified status. The privacy
 * note states the omission instead of faking a licence record.
 */
export function DlDetail({ profile }) {
  const t = useTranslations('verification')
  const tc = useTranslations('common')
  const router = useRouter()
  const v = profile?.verification ?? {}
  const name = profile?.name || '—'

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-ec-bg">
      <OverlayHeader title={t('driver.dlTitle')} onBack={() => router.push('/verify?intent=driver')} backLabel={tc('actions.back')} />
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        <p className="text-[14px] font-extrabold text-ec-ink">{t('detail.onlyYou')}</p>

        <div className="flex items-center gap-3.5 rounded-2xl border border-ec-line bg-white p-4 shadow-ec-card">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ec-sky text-ec-blue"><List size={22} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-bold text-ec-ink60">{t('detail.holder')}</p>
            <p className="truncate text-[15.5px] font-extrabold text-ec-ink">{name}</p>
          </div>
          <DocStatusBadge stateKey={docState(v.dlSubmitted)} />
        </div>

        <div className="flex items-start gap-2.5 rounded-2xl bg-ec-sky px-4 py-3.5">
          <span className="mt-0.5 inline-flex shrink-0 text-ec-blue"><Lock size={15} /></span>
          <p className="text-[12.5px] font-semibold leading-relaxed text-ec-blueInk">{t('detail.dlPrivacyNote')}</p>
        </div>
      </div>

      <div className="shrink-0 border-t border-ec-line bg-white p-3.5">
        <Button type="button" size="lg" onClick={() => router.push('/verify?intent=dl')} className="w-full">{t('detail.verifyAgain')}</Button>
      </div>
    </div>
  )
}
