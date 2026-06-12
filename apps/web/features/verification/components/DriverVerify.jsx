'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useDriverVerify } from '../hooks/useDriverVerify'
import { DocStatusBadge } from './DocStatusBadge'
import { docState } from '../lib/verifyView'

const field = 'h-12 w-full rounded-xl border-[1.5px] border-ec-line bg-white px-3 text-[15px] font-bold text-ec-ink outline-none focus:border-ec-blue'

/** L2 driver-credential submission (SCREENS §7) — DL + RC, each independent. */
export function DriverVerify({ status }) {
  const t = useTranslations('verification')
  const dv = useDriverVerify()
  const [dl, setDl] = useState({ dlNumber: '', dob: '' })
  const [rc, setRc] = useState('')
  const dlValid = dl.dlNumber.trim().length >= 5 && dl.dob !== ''
  const rcValid = rc.trim().length >= 4

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5">
      <header>
        <h1 className="text-[21px] font-extrabold text-ec-ink">{t('driver.title')}</h1>
        <p className="mt-1 text-[13px] font-medium text-ec-ink60">{t('driver.subtitle')}</p>
      </header>

      <section className="flex flex-col gap-3 rounded-2xl border border-ec-line bg-white p-4">
        <div className="flex items-center justify-between"><p className="text-[14.5px] font-extrabold text-ec-ink">{t('driver.dlTitle')}</p><DocStatusBadge stateKey={dv.dlResult ? 'submitted' : docState(status.dlSubmitted)} /></div>
        <label className="flex flex-col gap-1.5"><span className="text-[12.5px] font-bold text-ec-ink60">{t('driver.dlNumber')}</span>
          <input className={field} aria-label={t('driver.dlNumber')} value={dl.dlNumber} onChange={(e) => setDl((s) => ({ ...s, dlNumber: e.target.value.toUpperCase() }))} /></label>
        <label className="flex flex-col gap-1.5"><span className="text-[12.5px] font-bold text-ec-ink60">{t('driver.dob')}</span>
          <input type="date" className={field} aria-label={t('driver.dob')} value={dl.dob} onChange={(e) => setDl((s) => ({ ...s, dob: e.target.value }))} /></label>
        {dv.dlResult && <p className="text-[12.5px] font-bold text-ec-successTx">{t('driver.dlValid', { date: dv.dlResult.validUpto })} · {t('driver.dlCov', { cov: dv.dlResult.cov })}</p>}
        {dv.dlErrorKey && <p className="text-[12.5px] font-semibold text-ec-danger">{t(dv.dlErrorKey)}</p>}
        <button type="button" disabled={!dlValid || dv.dlSubmitting} onClick={() => dv.submitDl(dl)} className="h-11 rounded-xl bg-ec-blue text-[14px] font-extrabold text-white shadow-ec-blue disabled:bg-ec-disabled disabled:shadow-none">{dv.dlSubmitting ? t('driver.submitting') : t('driver.submit')}</button>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-ec-line bg-white p-4">
        <div className="flex items-center justify-between"><p className="text-[14.5px] font-extrabold text-ec-ink">{t('driver.rcTitle')}</p><DocStatusBadge stateKey={dv.rcResult ? 'submitted' : docState(status.rcSubmitted)} /></div>
        <label className="flex flex-col gap-1.5"><span className="text-[12.5px] font-bold text-ec-ink60">{t('driver.rcNumber')}</span>
          <input className={field} aria-label={t('driver.rcNumber')} value={rc} onChange={(e) => setRc(e.target.value.toUpperCase())} /></label>
        {dv.rcResult && <p className="text-[12.5px] font-bold text-ec-successTx">{t('driver.rcVehicle', { make: dv.rcResult.make, model: dv.rcResult.model })} · {t('driver.rcReg', { reg: dv.rcResult.regNo })}</p>}
        {dv.rcErrorKey && <p className="text-[12.5px] font-semibold text-ec-danger">{t(dv.rcErrorKey)}</p>}
        <button type="button" disabled={!rcValid || dv.rcSubmitting} onClick={() => dv.submitRc(rc)} className="h-11 rounded-xl bg-ec-blue text-[14px] font-extrabold text-white shadow-ec-blue disabled:bg-ec-disabled disabled:shadow-none">{dv.rcSubmitting ? t('driver.submitting') : t('driver.submit')}</button>
      </section>

      <p className="text-center text-[12px] font-medium text-ec-ink40">{t('driver.badgePending')}</p>
    </div>
  )
}
