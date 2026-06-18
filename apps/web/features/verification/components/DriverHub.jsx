'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Shield, Car, ChevR } from '@/components/ui/icons'
import { DocStatusBadge } from './DocStatusBadge'
import { docState } from '../lib/verifyView'

function DocCard({ icon, title, subtitle, stateKey, ctaKey, onOpen }) {
  const t = useTranslations('verification')
  return (
    <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 rounded-2xl border border-ec-line bg-white p-4 text-left">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ec-sky text-ec-blue">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-extrabold text-ec-ink">{title}</span>
        <span className="block text-[12px] font-medium text-ec-ink60">{subtitle}</span>
      </span>
      <DocStatusBadge stateKey={stateKey} />
      <span className="inline-flex text-ec-ink40"><ChevR size={16} /></span>
    </button>
  )
}

/** L2 driver-credential hub (#21): pick DL or RC → its own dedicated verify page. */
export function DriverHub({ status }) {
  const t = useTranslations('verification')
  const router = useRouter()
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5">
      <header>
        <h1 className="text-[21px] font-extrabold text-ec-ink">{t('driver.title')}</h1>
        <p className="mt-1 text-[13px] font-medium text-ec-ink60">{t('driver.subtitle')}</p>
      </header>
      <div className="flex flex-col gap-3">
        <DocCard icon={<Shield size={18} />} title={t('driver.dlTitle')} subtitle={t('driver.dlSubtitle')}
          stateKey={docState(status.dlSubmitted)} onOpen={() => router.push('/verify?intent=dl')} />
        <DocCard icon={<Car size={18} />} title={t('driver.rcTitle')} subtitle={t('driver.rcSubtitle')}
          stateKey={docState(status.rcSubmitted)} onOpen={() => router.push('/verify?intent=rc')} />
      </div>
      <p className="text-center text-[12px] font-medium text-ec-ink40">{t('driver.badgePending')}</p>
    </div>
  )
}
