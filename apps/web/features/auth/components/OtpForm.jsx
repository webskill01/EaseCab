'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

/**
 * OTP entry (DESIGN.md §7.1 step 2 / §6.10 OTP). A single accessible 6-digit
 * field (kept simple + testable) styled as one input; the visual 6-box treatment
 * is cosmetic. Verify enables at 6 digits.
 * @param {{ phone: string, onSubmit: (code: string) => void, onChangeNumber: () => void, loading: boolean, error: string|null }} props
 */
export function OtpForm({ phone, onSubmit, onChangeNumber, loading, error }) {
  const t = useTranslations('auth')
  const [code, setCode] = useState('')
  const valid = /^\d{6}$/.test(code)

  function handleSubmit(e) {
    e.preventDefault()
    if (valid && !loading) onSubmit(code)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h1 className="text-[21px] font-extrabold tracking-tight text-ec-ink">{t('otp.title')}</h1>
      <p className="text-[13.5px] text-ec-ink60">
        {t('otp.sentTo', { phone })}{' '}
        <button type="button" onClick={onChangeNumber} className="font-bold text-ec-blue">
          {t('otp.change')}
        </button>
      </p>
      <input
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label={t('otp.title') + ' verification code'}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        className="h-14 rounded-xl border-[1.5px] border-ec-line px-4 text-center text-[22px] font-extrabold tracking-[0.4em] text-ec-ink outline-none focus:border-ec-blue"
      />
      {error && <p className="text-[13px] font-semibold text-ec-danger">{t(error)}</p>}
      <button
        type="submit"
        disabled={!valid || loading}
        className="h-13 rounded-xl bg-ec-blue py-3.5 text-[15px] font-extrabold text-white shadow-ec-blue disabled:bg-[#CBD5E1] disabled:shadow-none"
      >
        {t('otp.verify')}
      </button>
    </form>
  )
}
