'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevL } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'

/** L1 step 2 — OTP to the Aadhaar-linked mobile (six boxes + 30s resend). */
export function AadhaarOtpStep({ onSubmit, onResend, onBack, loading, errorKey }) {
  const t = useTranslations('verification')
  const [code, setCode] = useState('')
  const [secs, setSecs] = useState(30)
  const inputRef = useRef(null)
  const valid = /^\d{6}$/.test(code)

  useEffect(() => {
    const id = setInterval(() => setSecs((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (valid && !loading) onSubmit(code) }} className="flex flex-1 flex-col gap-4 p-5">
      <button type="button" onClick={onBack} aria-label={t('l1.back')} className="-ml-2 self-start p-2 text-ec-ink"><ChevL size={24} /></button>
      <h1 className="text-[21px] font-extrabold text-ec-ink">{t('l1.otpTitle')}</h1>
      <p className="text-[14px] text-ec-ink60">{t('l1.otpSentTo')}</p>

      <div className="relative mt-2" onClick={() => inputRef.current?.focus()}>
        <input ref={inputRef} inputMode="numeric" autoComplete="one-time-code" aria-label={t('l1.otpTitle')}
          value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} className="absolute h-px w-px opacity-0" />
        <div className="flex gap-[9px]">
          {Array.from({ length: 6 }).map((_, i) => {
            const ch = code[i] ?? ''
            const filled = ch !== ''
            return <div key={i} className={`flex h-14 flex-1 items-center justify-center rounded-xl border-[1.5px] text-[22px] font-extrabold text-ec-ink ${filled ? 'border-ec-blue bg-ec-sky' : 'border-ec-line bg-white'}`}>{ch}</div>
          })}
        </div>
      </div>

      <div className="text-right text-[13px] font-semibold text-ec-ink60">
        {secs > 0 ? t('l1.resendIn', { seconds: secs }) : <button type="button" onClick={() => { setSecs(30); onResend() }} className="font-bold text-ec-blue">{t('l1.resend')}</button>}
      </div>

      {errorKey && <p className="text-[13px] font-semibold text-ec-danger">{t(errorKey)}</p>}
      <Button type="submit" size="lg" disabled={!valid || loading} className="w-full">{t('l1.verify')}</Button>
    </form>
  )
}
