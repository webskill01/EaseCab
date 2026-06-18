'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { OverlayHeader } from '@/components/ui/Overlay'
import { DocStatusBadge } from './DocStatusBadge'
import { KycUploader } from './KycUploader'
import { useDriverVerify } from '../hooks/useDriverVerify'
import { docState } from '../lib/verifyView'

const field = 'h-12 w-full rounded-xl border-[1.5px] border-ec-line bg-white px-3 text-[15px] font-bold text-ec-ink outline-none focus:border-ec-blue'

/** Dedicated Driving-Licence verify page (#21): number + DOB, verified data, image upload. */
export function DlVerify({ status }) {
  const t = useTranslations('verification')
  const tc = useTranslations('common')
  const router = useRouter()
  const dv = useDriverVerify()
  const [dlNumber, setDlNumber] = useState('')
  const [dob, setDob] = useState('')
  const valid = dlNumber.trim().length >= 5 && dlNumber.trim().length <= 16 && dob !== ''
  const submitted = Boolean(dv.dlResult) || status.dlSubmitted

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-ec-bg">
      <OverlayHeader title={t('driver.dlTitle')} onBack={() => router.push('/verify?intent=driver')} backLabel={tc('actions.back')} />
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-medium text-ec-ink60">{t('driver.dlSubtitle')}</p>
          <DocStatusBadge stateKey={dv.dlResult ? 'submitted' : docState(status.dlSubmitted)} />
        </div>

        <label className="flex flex-col gap-1.5"><span className="text-[12.5px] font-bold text-ec-ink60">{t('driver.dlNumber')}</span>
          <input className={field} maxLength={16} aria-label={t('driver.dlNumber')} value={dlNumber} onChange={(e) => setDlNumber(e.target.value.toUpperCase().replace(/\s/g, ''))} /></label>
        <label className="flex flex-col gap-1.5"><span className="text-[12.5px] font-bold text-ec-ink60">{t('driver.dob')}</span>
          <input type="date" className={field} aria-label={t('driver.dob')} value={dob} onChange={(e) => setDob(e.target.value)} /></label>

        {dv.dlResult && (
          <div className="rounded-xl border border-ec-line bg-white p-3 text-[12.5px] font-bold text-ec-successTx">
            {t('driver.dlValid', { date: dv.dlResult.validUpto })} · {t('driver.dlCov', { cov: dv.dlResult.cov })}
          </div>
        )}
        {dv.dlErrorKey && <p className="text-[12.5px] font-semibold text-ec-danger">{t(dv.dlErrorKey)}</p>}

        <button type="button" disabled={!valid || dv.dlSubmitting} onClick={() => dv.submitDl({ dlNumber, dob })} className="h-11 rounded-xl bg-ec-blue text-[14px] font-extrabold text-white shadow-ec-blue disabled:bg-ec-disabled disabled:shadow-none">
          {dv.dlSubmitting ? t('driver.submitting') : t('driver.submit')}
        </button>

        {submitted && (
          <div className="flex flex-col gap-1.5">
            <p className="text-[12.5px] font-bold text-ec-ink60">{t('driver.uploadOptional')}</p>
            <KycUploader purpose="licence_image" label={t('driver.uploadDl')} />
          </div>
        )}
      </div>

      {submitted && (
        <div className="shrink-0 border-t border-ec-line bg-white p-3.5">
          <button type="button" onClick={() => router.push('/profile')} className="h-[52px] w-full rounded-xl bg-ec-blueInk text-[15.5px] font-extrabold text-white">{t('driver.done')}</button>
        </div>
      )}
    </div>
  )
}
