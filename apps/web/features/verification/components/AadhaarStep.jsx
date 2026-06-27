'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Shield, ChevL } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { groupAadhaar } from '../lib/verifyView'
import { InfoNote } from './InfoNote'
import { ManualFallbackNote } from './ManualFallbackNote'

/** L1 step 1 — Aadhaar number entry (SCREENS §7). Input shows 4-4-4 groups (#18). */
export function AadhaarStep({ onSubmit, loading, errorKey }) {
  const t = useTranslations('verification')
  const router = useRouter()
  const [num, setNum] = useState('')
  const valid = /^\d{12}$/.test(num)
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (valid && !loading) onSubmit(num) }} className="flex flex-1 flex-col gap-4 p-5">
      <button type="button" onClick={() => router.back()} aria-label={t('l1.back')} className="-ml-2 self-start p-2 text-ec-ink"><ChevL size={24} /></button>
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ec-sky text-ec-blue"><Shield size={24} /></span>
      <h1 className="text-[21px] font-extrabold text-ec-ink">{t('l1.title')}</h1>
      <InfoNote>{t('l1.note')}</InfoNote>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-bold text-ec-ink60">{t('l1.aadhaarLabel')}</span>
        <input inputMode="numeric" value={groupAadhaar(num)} onChange={(e) => setNum(e.target.value.replace(/\D/g, '').slice(0, 12))}
          placeholder="1234 5678 9012" aria-label={t('l1.aadhaarLabel')} className="h-12 rounded-xl border-[1.5px] border-ec-line bg-white px-3 text-[16px] font-bold tracking-[0.2em] text-ec-ink outline-none focus:border-ec-blue placeholder:tracking-[0.2em] placeholder:text-ec-ink40" />
        <span className="text-[12px] font-medium text-ec-ink40">{t('l1.aadhaarHint')}</span>
      </label>
      {errorKey && <p className="text-[13px] font-semibold text-ec-danger">{t(errorKey)}</p>}
      <Button type="submit" size="lg" disabled={!valid || loading} className="w-full">{t('l1.continue')}</Button>
      <ManualFallbackNote />
    </form>
  )
}
