'use client'

import { useTranslations } from 'next-intl'
import { useOtpLogin } from '@/features/auth/hooks/useOtpLogin'
import { PhoneForm } from '@/features/auth/components/PhoneForm'
import { OtpForm } from '@/features/auth/components/OtpForm'
import { PermissionsStep } from '@/features/auth/components/PermissionsStep'
import { DoneScreen } from '@/features/auth/components/DoneScreen'

const STEPS = ['phone', 'otp', 'perms']

/**
 * Onboarding shell (docs/design/SCREENS.md §1): phone → OTP → permissions → done.
 * Each step is self-contained (the hero lives in PhoneForm, the compact brandmark in
 * OtpForm); this just switches on the phase and renders the step-dots. The hidden
 * recaptcha-container is required by Firebase's invisible reCAPTCHA.
 */
export default function LoginPage() {
  useTranslations('auth')
  const s = useOtpLogin()

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col bg-white">
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
      {s.phase === 'perms' && <PermissionsStep onContinue={s.finishPermissions} />}
      {s.phase === 'done' && <DoneScreen onEnter={s.goToFeed} />}

      {s.phase !== 'done' && (
        <div className="flex justify-center gap-1.5 bg-white pb-3.5">
          {STEPS.map((step) => (
            <span
              key={step}
              className={
                step === s.phase
                  ? 'h-1.5 w-[22px] rounded-full bg-ec-blue transition-all'
                  : 'h-1.5 w-1.5 rounded-full bg-ec-line transition-all'
              }
            />
          ))}
        </div>
      )}

      <div id="recaptcha-container" />
    </main>
  )
}
