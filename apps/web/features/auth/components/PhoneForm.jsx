'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { ChevR } from '@/components/ui/icons'

/**
 * Onboarding step 1 — phone (docs/design/SCREENS.md §1, prototype login.jsx PhoneStep).
 * Brand-only hero (blue gradient, the app icon in a glass tile, region pill), then a
 * liquid-glass sheet with "Login or sign up", a +91-prefixed 10-digit field, and
 * Continue pinned to the bottom. Glass styles: app/globals.css (.ec-glass*).
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
    <div className="flex flex-1 flex-col">
      {/* curved-bottom brand hero */}
      <div
        className="ec-hero-brand relative flex h-[300px] shrink-0 flex-col items-center justify-center overflow-hidden pb-8 text-white"
        style={{ borderRadius: '0 0 50% 50% / 0 0 44px 44px' }}
      >
        <span aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.16)_1px,transparent_1.4px)] [background-size:14px_14px] [mask-image:linear-gradient(#000,transparent_85%)]" />
        <span aria-hidden="true" className="absolute -right-12 top-4 h-44 w-44 rounded-full bg-sky-300/35 blur-3xl" />
        <span aria-hidden="true" className="absolute -left-14 bottom-0 h-40 w-40 rounded-full bg-indigo-400/30 blur-3xl" />
        <div className="ec-glass-dark animate-ec-pop rounded-[28px] p-2 motion-reduce:animate-none">
          <Image src="/icons/icon-192.png" unoptimized alt="EaseCab" width={76} height={76} priority className="rounded-[21px]" />
        </div>
        <p className="mt-3.5 text-[28px] font-extrabold leading-none tracking-tight">{t('brand.name')}</p>
        <p className="mt-1.5 text-[13px] font-medium text-white/90">{t('brand.tagline')}</p>
        <span className="ec-glass-dark mt-3 rounded-full px-3 py-1 text-[11px] font-bold tracking-wide">{t('brand.regions')}</span>
      </div>

      {/* form on a glass sheet that overlaps the hero's curve */}
      <form onSubmit={handleSubmit} className="ec-glass relative z-10 mx-3.5 -mt-8 mb-3 flex flex-1 flex-col rounded-[28px] px-[18px] py-[22px]">
        <h1 className="text-[21px] font-extrabold tracking-tight text-ec-ink">{t('phone.title')}</h1>
        <p className="mt-1.5 text-[14px] leading-relaxed text-ec-ink60">{t('phone.subtitle')}</p>

        <div className="mt-6">
          <label className="mb-2 block text-[13px] font-bold text-ec-ink" htmlFor="phone">
            {t('phone.label')}
          </label>
          <div
            className={`flex h-14 items-stretch overflow-hidden rounded-xl border-[1.5px] bg-white shadow-ec-float ${
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
              className="h-full min-w-0 flex-1 bg-transparent px-3.5 text-[17px] font-bold tracking-wide text-ec-ink outline-none"
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
        <p className="mt-1.5 text-center text-[10px] leading-relaxed text-ec-ink40">
          {t.rich('phone.recaptcha', {
            privacy: (chunks) => <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline">{chunks}</a>,
            terms: (chunks) => <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline">{chunks}</a>,
          })}
        </p>
      </form>
    </div>
  )
}
