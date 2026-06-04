'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useOtpLogin } from '@/features/auth/hooks/useOtpLogin'
import { PhoneForm } from '@/features/auth/components/PhoneForm'
import { OtpForm } from '@/features/auth/components/OtpForm'
import { DoneScreen } from '@/features/auth/components/DoneScreen'

/**
 * Hero-first onboarding (DESIGN.md §7.1). A top hero image, then the brandmark
 * and the active phase below it. Phase comes from useOtpLogin. The hidden
 * recaptcha-container is required by Firebase's invisible reCAPTCHA.
 */
export default function LoginPage() {
  const t = useTranslations('auth')
  const s = useOtpLogin()
  const stepIndex = s.phase === 'phone' ? 0 : s.phase === 'otp' ? 1 : 2

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col bg-white">
      <div className="relative h-60 w-full">
        <Image src="/images/login-hero.svg" alt="" fill priority unoptimized className="object-cover" />
      </div>

      <div className="flex flex-1 flex-col gap-6 px-[22px] py-6">
        <div className="text-center">
          <p className="text-[26px] font-extrabold tracking-tight text-ec-blue">{t('brand.name')}</p>
          <p className="text-[12px] font-semibold text-ec-ink40">{t('brand.tagline')}</p>
        </div>

        {s.phase === 'phone' && (
          <PhoneForm onSubmit={s.submitPhone} loading={s.loading} error={s.error} />
        )}
        {s.phase === 'otp' && (
          <OtpForm
            phone={s.phone}
            onSubmit={s.submitOtp}
            onChangeNumber={s.changeNumber}
            loading={s.loading}
            error={s.error}
          />
        )}
        {s.phase === 'done' && <DoneScreen onEnter={s.goToFeed} />}

        <div className="mt-auto flex justify-center gap-2 pt-4">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={
                i === stepIndex
                  ? 'h-1.5 w-6 rounded-full bg-ec-blue'
                  : 'h-1.5 w-1.5 rounded-full bg-ec-line'
              }
            />
          ))}
        </div>
      </div>

      <div id="recaptcha-container" />
    </main>
  )
}
