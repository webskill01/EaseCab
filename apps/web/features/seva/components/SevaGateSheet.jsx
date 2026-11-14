'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { SheetTitle } from '@/components/ui/SheetTitle'
import { Button } from '@/components/ui/button'
import { Crown } from '@/components/ui/icons'

/** Members-only gate for Seva services (Border Tax, WhatsApp group). */
export function SevaGateSheet({ onClose }) {
  const t = useTranslations('seva')
  const tc = useTranslations('common')
  const router = useRouter()
  return (
    <BottomSheet centered closeLabel={tc('actions.close')} onClose={onClose} label={t('bt.gate.title')}>
      <SheetTitle icon={<Crown size={22} />} tone="blue" title={t('bt.gate.title')} sub={t('bt.gate.sub')} />
      <div className="flex flex-col gap-3 pb-2">
        <Button type="button" size="lg" className="w-full" onClick={() => router.push('/membership')}>{t('bt.gate.subscribe')}</Button>
        <Button type="button" variant="ghost" className="w-full bg-ec-bg font-bold text-ec-ink60" onClick={onClose}>{t('bt.gate.notNow')}</Button>
      </div>
    </BottomSheet>
  )
}
