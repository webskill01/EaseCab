'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { ChevL } from '@/components/ui/icons'

/**
 * Onboarding step 2 — OTP (docs/design/SCREENS.md §1, prototype login.jsx OtpStep).
 * Back chevron + compact brandmark, masked number with Change, six OTP boxes driven by a
 * single hidden input (kept accessible + testable via its aria-label), and a 30s resend
 * countdown. Verify enables at 6 digits.
 * @param {{ phone: string, onSubmit: (code: string) => void, onChangeNumber: () => void, loading: boolean, error: string|null }} props
 */
export function OtpForm({ phone, onSubmit, onChangeNumber, loading, error }) {
  const t = useTranslations('auth')
  const [code, setCode] = useState('')
  const [secs, setSecs] = useState(30)
  const inputRef = useRef(null)
  const valid = /^\d{6}$/.test(code)

  useEffect(() => {
    const id = setInterval(() => setSecs((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [])

  // WebOTP (Chrome/Brave on Android): reads the code from an SMS whose last line is
  // "@easecab.com #123456" after one "Allow" tap, then verifies right away.
  const submitRef = useRef(onSubmit)
  submitRef.current = onSubmit
  useEffect(() => {
    if (typeof window === 'undefined' || !('OTPCredential' in window)) return
    const ac = new AbortController()
    ;(async () => {
      try {
        const otp = await navigator.credentials.get({ otp: { transport: ['sms'] }, signal: ac.signal })
        const c = (otp?.code ?? '').replace(/\D/g, '').slice(0, 6)
        if (c.length !== 6) return
        setCode(c)
        submitRef.current(c)
      } catch { /* aborted, dismissed or unsupported — the user types the code */ }
    })()
    return () => ac.abort()
  }, [])

  const national = phone.replace(/^\+91/, '')
  const prettyPhone = `+91 ${national.replace(/(\d{5})(\d{5})/, '$1 $2') || national}`

  function handleSubmit(e) {
    e.preventDefault()
    if (valid && !loading) onSubmit(code)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col px-[22px] pb-[22px] pt-3.5">
      <button
        type="button"
        onClick={onChangeNumber}
        aria-label={t('otp.back')}
        className="ec-glass -ml-1 self-start rounded-full p-2 text-ec-ink"
      >
        <ChevL size={24} />
      </button>

      {/* compact brandmark: glass chip + region pill, like the login hero */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <div className="ec-glass flex items-center gap-[10px] rounded-[22px] py-1.5 pl-1.5 pr-4">
          <Image src="/icons/icon-192.png" unoptimized alt="EaseCab" width={42} height={42} priority className="shrink-0 rounded-[14px]" />
          <div>
            <p className="text-[17px] font-extrabold leading-none tracking-tight text-ec-ink">{t('brand.name')}</p>
            <p className="mt-[3px] text-[11px] font-semibold text-ec-ink60">{t('brand.tagline')}</p>
          </div>
        </div>
        <span className="ec-glass rounded-full px-3 py-1 text-[11px] font-bold tracking-wide text-ec-blueInk">{t('brand.regions')}</span>
      </div>

      {/* glass card: heading, code boxes, resend */}
      <div className="ec-glass mt-6 rounded-[26px] p-[18px]">
        <h1 className="text-[21px] font-extrabold tracking-tight text-ec-ink">{t('otp.title')}</h1>
        <p className="mt-1.5 text-[14px] text-ec-ink60">
          {t('otp.sentTo', { phone: prettyPhone })}{' '}
          <button type="button" onClick={onChangeNumber} className="font-bold text-ec-blue">
            {t('otp.change')}
          </button>
        </p>

        {/* six boxes driven by a hidden input */}
        <div className="relative mt-6" onClick={() => inputRef.current?.focus()}>
          <input
            ref={inputRef}
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-label={t('otp.title') + ' verification code'}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="absolute h-px w-px opacity-0"
          />
          <div className="flex gap-[9px]">
            {Array.from({ length: 6 }).map((_, i) => {
              const ch = code[i] ?? ''
              const filled = ch !== ''
              const cursor = i === code.length
              return (
                <div
                  key={i}
                  className={`flex h-14 flex-1 items-center justify-center rounded-xl border-[1.5px] text-[22px] font-extrabold text-ec-ink shadow-ec-card ${
                    filled ? 'border-ec-blue bg-ec-sky' : cursor ? 'border-ec-blue bg-white' : 'border-ec-line bg-white'
                  }`}
                >
                  {ch}
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-4 text-right text-[13px] font-semibold text-ec-ink60">
          {secs > 0 ? (
            t('otp.resendIn', { seconds: secs })
          ) : (
            <button type="button" onClick={() => setSecs(30)} className="font-bold text-ec-blue">
              {t('otp.resend')}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1" />

      {error && <p className="mb-3 text-[13px] font-semibold text-ec-danger">{t(error)}</p>}
      <Button type="submit" size="lg" disabled={!valid || loading} className="w-full">
        {t('otp.verify')}
      </Button>
    </form>
  )
}
