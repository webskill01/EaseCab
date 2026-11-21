'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { StatusSheet } from '@/components/ui/StatusSheet'
import { Button } from '@/components/ui/button'
import { Crown } from '@/components/ui/icons'

/** Members-only gate for Seva services (Border Tax, WhatsApp group). */
export function SevaGateSheet({ onClose }) {
  const t = useTranslations('seva')
  const router = useRouter()
  return (
    <StatusSheet tone="brand" icon={<Crown size={24} />} title={t('bt.gate.title')} body={t('bt.gate.sub')} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <Button type="button" size="lg" className="w-full" onClick={() => router.push('/membership')}>{t('bt.gate.subscribe')}</Button>
        <Button type="button" variant="ghost" className="w-full bg-ec-bg font-bold text-ec-ink60" onClick={onClose}>{t('bt.gate.notNow')}</Button>
      </div>
    </StatusSheet>
  )
}
