'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Steer, ChevL } from '@/components/ui/icons'

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

  const national = phone.replace(/^\+91/, '')
  const prettyPhone = `+91 ${national.replace(/(\d{5})(\d{5})/, '$1 $2') || national}`

  function handleSubmit(e) {
    e.preventDefault()
    if (valid && !loading) onSubmit(code)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col bg-white px-[22px] pb-[22px] pt-3.5">
      <button
        type="button"
        onClick={onChangeNumber}
        aria-label={t('otp.back')}
        className="-ml-2 self-start p-2 text-ec-ink"
      >
        <ChevL size={24} />
      </button>

      {/* compact brandmark */}
      <div className="mt-2 flex items-center gap-[11px]">
        <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[13px] bg-ec-blue text-white shadow-ec-blue">
          <Steer size={27} />
        </div>
        <div>
          <p className="text-[18px] font-extrabold leading-none tracking-tight text-ec-ink">{t('brand.name')}</p>
          <p className="mt-[3px] text-[11.5px] font-semibold text-ec-ink40">{t('brand.tagline')}</p>
        </div>
      </div>

      <div className="mt-6">
        <h1 className="text-[21px] font-extrabold tracking-tight text-ec-ink">{t('otp.title')}</h1>
        <p className="mt-1.5 text-[14px] text-ec-ink60">
          {t('otp.sentTo', { phone: prettyPhone })}{' '}
          <button type="button" onClick={onChangeNumber} className="font-bold text-ec-blue">
            {t('otp.change')}
          </button>
        </p>
      </div>

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
                className={`flex h-14 flex-1 items-center justify-center rounded-xl border-[1.5px] text-[22px] font-extrabold text-ec-ink ${
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

      <div className="flex-1" />

      {error && <p className="mb-3 text-[13px] font-semibold text-ec-danger">{t(error)}</p>}
      <button
        type="submit"
        disabled={!valid || loading}
        className="flex h-[54px] items-center justify-center rounded-xl bg-ec-blue text-[16px] font-extrabold text-white shadow-ec-blue disabled:bg-[#CBD5E1] disabled:shadow-none"
      >
        {t('otp.verify')}
      </button>
    </form>
  )
}
