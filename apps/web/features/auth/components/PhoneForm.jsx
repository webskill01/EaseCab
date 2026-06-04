'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

/**
 * Phone entry (DESIGN.md §7.1 step 1 + §6.10 prefix group). Accepts exactly 10
 * digits after the fixed +91 prefix; Continue enables only when valid. The parent
 * (login page) owns the OTP flow via useOtpLogin.
 * @param {{ onSubmit: (digits: string) => void, loading: boolean, error: string|null }} props
 */
export function PhoneForm({ onSubmit, loading, error }) {
  const t = useTranslations('auth')
  const [digits, setDigits] = useState('')
  const valid = /^\d{10}$/.test(digits)

  function handleSubmit(e) {
    e.preventDefault()
    if (valid && !loading) onSubmit(digits)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h1 className="text-[21px] font-extrabold tracking-tight text-ec-ink">{t('phone.title')}</h1>
      <label className="text-[13px] font-bold text-ec-ink60" htmlFor="phone">
        {t('phone.label')}
      </label>
      <div className="flex items-stretch overflow-hidden rounded-xl border-[1.5px] border-ec-line focus-within:border-ec-blue">
        <span className="flex items-center bg-ec-bg px-3 text-[15px] font-bold text-ec-ink">🇮🇳 +91</span>
        <input
          id="phone"
          inputMode="numeric"
          autoComplete="tel-national"
          aria-label={t('phone.label')}
          placeholder={t('phone.placeholder')}
          value={digits}
          onChange={(e) => setDigits(e.target.value.replace(/\D/g, '').slice(0, 10))}
          className="h-14 flex-1 px-3 text-[16px] font-semibold text-ec-ink outline-none"
        />
      </div>
      {error && <p className="text-[13px] font-semibold text-ec-danger">{t(error)}</p>}
      <button
        type="submit"
        disabled={!valid || loading}
        className="h-13 rounded-xl bg-ec-blue py-3.5 text-[15px] font-extrabold text-white shadow-ec-blue disabled:bg-[#CBD5E1] disabled:shadow-none"
      >
        {t('phone.continue')}
      </button>
      <p className="text-center text-[11.5px] leading-relaxed text-ec-ink40">{t('phone.terms')}</p>
    </form>
  )
}
