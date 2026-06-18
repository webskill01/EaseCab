'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Shield } from '@/components/ui/icons'
import { groupAadhaar } from '../lib/verifyView'
import { ManualFallbackNote } from './ManualFallbackNote'

/** L1 step 1 — Aadhaar number entry (SCREENS §7). Input shows 4-4-4 groups (#18). */
export function AadhaarStep({ onSubmit, loading, errorKey }) {
  const t = useTranslations('verification')
  const [num, setNum] = useState('')
  const valid = /^\d{12}$/.test(num)
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (valid && !loading) onSubmit(num) }} className="flex flex-1 flex-col gap-4 p-5">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ec-sky text-ec-blue"><Shield size={24} /></span>
      <h1 className="text-[21px] font-extrabold text-ec-ink">{t('l1.title')}</h1>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-bold text-ec-ink60">{t('l1.aadhaarLabel')}</span>
        <input inputMode="numeric" value={groupAadhaar(num)} onChange={(e) => setNum(e.target.value.replace(/\D/g, '').slice(0, 12))}
          placeholder="1234 5678 9012" aria-label={t('l1.aadhaarLabel')} className="h-12 rounded-xl border-[1.5px] border-ec-line bg-white px-3 text-[16px] font-bold tracking-[0.2em] text-ec-ink outline-none focus:border-ec-blue placeholder:tracking-[0.2em] placeholder:text-ec-ink40" />
        <span className="text-[12px] font-medium text-ec-ink40">{t('l1.aadhaarHint')}</span>
      </label>
      {errorKey && <p className="text-[13px] font-semibold text-ec-danger">{t(errorKey)}</p>}
      <button type="submit" disabled={!valid || loading} className="h-[52px] rounded-xl bg-ec-blue text-[15.5px] font-extrabold text-white shadow-ec-blue disabled:bg-ec-disabled disabled:shadow-none">{t('l1.continue')}</button>
      <ManualFallbackNote />
    </form>
  )
}
