'use client'

import { useTranslations } from 'next-intl'
import { BottomSheet } from '@/components/ui/BottomSheet'
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
      <div className="flex flex-col items-center gap-3 pb-2 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ec-sky text-ec-blue"><Shield size={26} /></div>
        <h2 className="text-[18px] font-extrabold text-ec-ink">{t('gate.title')}</h2>
        <p className="max-w-[300px] text-[13.5px] font-medium text-ec-ink60">{t('gate.body')}</p>
        <button type="button" onClick={onVerify} className="mt-1 h-[52px] w-full rounded-xl bg-ec-blue text-[15.5px] font-extrabold text-white shadow-ec-blue">
          {t('gate.cta')}
        </button>
      </div>
    </BottomSheet>
  )
}
