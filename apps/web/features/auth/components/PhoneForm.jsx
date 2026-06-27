'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Steer, ChevR } from '@/components/ui/icons'

/**
 * Onboarding step 1 — phone (docs/design/SCREENS.md §1, prototype login.jsx PhoneStep).
 * A curved-bottom photo hero with the brand overlaid, then "Login or sign up", a
 * +91-prefixed 10-digit field, and Continue pinned to the bottom. The hero image is a
 * placeholder (public/images/login-hero.svg) — swap the file for a real cab photo later.
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
    <div className="flex flex-1 flex-col overflow-hidden bg-white">
      {/* curved-bottom hero with brand overlay */}
      <div
        className="relative h-72 shrink-0 overflow-hidden bg-ec-blueInk"
        style={{ borderRadius: '0 0 50% 50% / 0 0 44px 44px' }}
      >
        <Image src="/images/login-hero.svg" alt="" fill priority unoptimized className="object-cover" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-black/5 to-black/70" />
        <div className="pointer-events-none absolute inset-x-[22px] bottom-[30px] flex items-center gap-3">
          <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[15px] bg-ec-blue text-white shadow-ec-float">
            <Steer size={32} />
          </div>
          <div>
            <p className="text-[26px] font-extrabold leading-none tracking-tight text-white">{t('brand.name')}</p>
            <p className="mt-1 text-[13px] font-medium text-white/90">{t('brand.tagline')}</p>
          </div>
        </div>
      </div>

      {/* form */}
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col px-[22px] py-[22px]">
        <h1 className="text-[21px] font-extrabold tracking-tight text-ec-ink">{t('phone.title')}</h1>
        <p className="mt-1.5 text-[14px] leading-relaxed text-ec-ink60">{t('phone.subtitle')}</p>

        <div className="mt-6">
          <label className="mb-2 block text-[13px] font-bold text-ec-ink" htmlFor="phone">
            {t('phone.label')}
          </label>
          <div
            className={`flex h-14 items-stretch overflow-hidden rounded-xl border-[1.5px] bg-white ${
              valid ? 'border-ec-blue' : 'border-ec-line'
            }`}
          >
            <span className="flex items-center border-r border-ec-line bg-ec-bg px-3.5 text-[16px] font-bold text-ec-ink">
              +91
            </span>
            <input
              id="phone"
              inputMode="numeric"
              autoComplete="tel-national"
              aria-label={t('phone.label')}
              placeholder={t('phone.placeholder')}
              value={digits}
              onChange={(e) => setDigits(e.target.value.replace(/\D/g, '').slice(0, 10))}
              className="h-full flex-1 px-3.5 text-[17px] font-bold tracking-wide text-ec-ink outline-none"
            />
          </div>
        </div>

        <div className="flex-1" />

        {error && <p className="mb-3 text-[13px] font-semibold text-ec-danger">{t(error)}</p>}
        <Button type="submit" size="lg" disabled={!valid || loading} className="w-full">
          {t('phone.continue')}
          <ChevR size={18} />
        </Button>
        <p className="mt-3.5 text-center text-[11.5px] leading-relaxed text-ec-ink40">
          {t.rich('phone.terms', {
            break: () => <br />,
            terms: (chunks) => (
              <Link href="/terms" className="font-semibold text-ec-blue">
                {chunks}
              </Link>
            ),
            privacy: (chunks) => (
              <Link href="/privacy-policy" className="font-semibold text-ec-blue">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </form>
    </div>
  )
}
