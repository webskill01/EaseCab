'use client'

import { useTranslations } from 'next-intl'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { SheetTitle } from '@/components/ui/SheetTitle'
import { Button } from '@/components/ui/button'
import { Shield } from '@/components/ui/icons'

/**
 * Verification soft-gate sheet (SCREENS §5) — shown when create returns
 * 403 VERIFICATION_REQUIRED. The CTA routes to the Step-21 profile/verification
 * screen (mirrors how the contact gate routes to /membership).
 *
 * @param {{ onClose: () => void, onVerify: () => void }} props
 */
export function VerifyGateSheet({ onClose, onVerify }) {
  const t = useTranslations('post')
  return (
    <BottomSheet onClose={onClose} label={t('gate.title')}>
      <SheetTitle icon={<Shield size={22} />} tone="blueInk" title={t('gate.title')} sub={t('gate.body')} />
      <div className="flex flex-col gap-2.5 pb-2">
        <Button type="button" size="lg" onClick={onVerify} className="w-full">
          {t('gate.cta')}
        </Button>
        <Button type="button" variant="ghost" onClick={onClose} className="w-full bg-ec-bg font-bold text-ec-ink60">
          {t('gate.notNow')}
        </Button>
      </div>
    </BottomSheet>
  )
}
