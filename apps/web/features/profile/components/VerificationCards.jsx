'use client'

import { useTranslations } from 'next-intl'
import { Shield, Car } from '@/components/ui/icons'
import { maskAadhaar } from '@/features/verification/lib/verifyView'

function StatusChip({ stateKey }) {
  const t = useTranslations('profile')
  const tone = stateKey === 'verified'
    ? 'bg-ec-successBg text-ec-successTx'
    : stateKey === 'submitted' ? 'bg-ec-bookedBg text-ec-bookedTx' : 'bg-ec-bg text-ec-ink60'
  return <span className={`rounded-full px-2.5 py-1 text-[11.5px] font-extrabold ${tone}`}>{t(`status.${stateKey}`)}</span>
}

/**
 * L1 (Aadhaar) + L2 (driver) status cards (SCREENS §6/§7).
 * @param {{ verification: object, onStartL1: () => void, onStartL2: () => void }} props
 */
export function VerificationCards({ verification: v, onStartL1, onStartL2 }) {
  const t = useTranslations('profile')
  const l1State = v.aadhaarVerified ? 'verified' : 'notStarted'
  const l2State = (v.dlSubmitted || v.rcSubmitted)
    ? (v.verificationStatus === 'verified' ? 'verified' : 'submitted')
    : 'notStarted'

  return (
    <div className="flex flex-col gap-3">
      <section className="rounded-2xl border border-ec-line bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ec-sky text-ec-blue"><Shield size={18} /></span>
            <div>
              <p className="text-[14.5px] font-extrabold text-ec-ink">{t('verifyCard.l1Title')}</p>
              <p className="text-[12px] font-medium text-ec-ink60">{t('verifyCard.l1Unlocks')}</p>
            </div>
          </div>
          <StatusChip stateKey={l1State} />
        </div>
        {v.aadhaarVerified
          ? <p className="mt-3 text-[12.5px] font-bold text-ec-ink60">{maskAadhaar(v.aadhaarLast4)}</p>
          : <button type="button" onClick={onStartL1} className="mt-3 h-10 w-full rounded-xl bg-ec-blue text-[13.5px] font-extrabold text-white shadow-ec-blue">{t('verifyCard.start')}</button>}
      </section>

      <section className="rounded-2xl border border-ec-line bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ec-sky text-ec-blue"><Car size={18} /></span>
            <div>
              <p className="text-[14.5px] font-extrabold text-ec-ink">{t('verifyCard.l2Title')}</p>
              <p className="text-[12px] font-medium text-ec-ink60">{t('verifyCard.l2Unlocks')}</p>
            </div>
          </div>
          <StatusChip stateKey={l2State} />
        </div>
        {(v.carMake || v.carModel) && <p className="mt-3 text-[12.5px] font-bold text-ec-ink60">{t('verifyCard.carLabel')}: {[v.carMake, v.carModel].filter(Boolean).join(' ')}</p>}
        <button type="button" onClick={onStartL2} className="mt-3 h-10 w-full rounded-xl border-[1.5px] border-ec-line bg-white text-[13.5px] font-extrabold text-ec-blueInk">{l2State === 'notStarted' ? t('verifyCard.start') : t('verifyCard.manage')}</button>
      </section>
    </div>
  )
}
