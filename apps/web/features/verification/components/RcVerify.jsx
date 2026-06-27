'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { OverlayHeader } from '@/components/ui/Overlay'
import { Button } from '@/components/ui/button'
import { Car } from '@/components/ui/icons'
import { DocStatusBadge } from './DocStatusBadge'
import { InfoNote } from './InfoNote'
import { KycUploader } from './KycUploader'
import { useDriverVerify } from '../hooks/useDriverVerify'
import { docState } from '../lib/verifyView'

const field = 'h-12 w-full rounded-xl border-[1.5px] border-ec-line bg-white px-3 text-[15px] font-bold text-ec-ink outline-none focus:border-ec-blue'

/** Dedicated RC verify page (#21): reg number, verified vehicle data, image upload. */
export function RcVerify({ status }) {
  const t = useTranslations('verification')
  const tc = useTranslations('common')
  const router = useRouter()
  const dv = useDriverVerify()
  const [rc, setRc] = useState('')
  const [imageAttached, setImageAttached] = useState(false)
  const valid = rc.trim().length >= 4 && rc.trim().length <= 12
  const submitted = Boolean(dv.rcResult) || status.rcSubmitted

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-ec-bg">
      <OverlayHeader title={t('driver.rcTitle')} onBack={() => router.push('/verify?intent=driver')} backLabel={tc('actions.back')} />
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
        <InfoNote icon={<Car size={16} />}>{t('driver.rcNote')}</InfoNote>
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-medium text-ec-ink60">{t('driver.rcSubtitle')}</p>
          <DocStatusBadge stateKey={dv.rcResult ? 'submitted' : docState(status.rcSubmitted)} />
        </div>

        <label className="flex flex-col gap-1.5"><span className="text-[12.5px] font-bold text-ec-ink60">{t('driver.rcNumber')}</span>
          <input className={field} maxLength={12} aria-label={t('driver.rcNumber')} value={rc} onChange={(e) => setRc(e.target.value.toUpperCase().replace(/\s/g, ''))} /></label>

        {dv.rcResult && (
          <div className="rounded-xl border border-ec-line bg-white p-3 text-[12.5px] font-bold text-ec-successTx">
            {t('driver.rcVehicle', { make: dv.rcResult.make, model: dv.rcResult.model })} · {t('driver.rcReg', { reg: dv.rcResult.regNo })}
          </div>
        )}
        {dv.rcErrorKey && <p className="text-[12.5px] font-semibold text-ec-danger">{t(dv.rcErrorKey)}</p>}

        <Button type="button" size="lg" disabled={!valid || dv.rcSubmitting} onClick={() => dv.submitRc(rc)} className="w-full">
          {dv.rcSubmitting ? t('driver.submitting') : t('driver.submit')}
        </Button>

        {submitted && (
          <div className="flex flex-col gap-1.5">
            <p className="text-[12.5px] font-bold text-ec-ink60">{t('driver.uploadRequired')}</p>
            <KycUploader purpose="rc_image" label={t('driver.uploadRc')} onUploaded={() => setImageAttached(true)} />
          </div>
        )}
      </div>

      {submitted && (
        <div className="shrink-0 border-t border-ec-line bg-white p-3.5">
          <Button type="button" size="lg" disabled={!imageAttached} onClick={() => router.push('/verify?intent=center')} className="w-full">{t('driver.done')}</Button>
        </div>
      )}
    </div>
  )
}
