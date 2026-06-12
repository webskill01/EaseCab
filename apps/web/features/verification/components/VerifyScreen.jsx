'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useProfile } from '@/features/profile/hooks/useProfile'
import { useAadhaarFlow } from '../hooks/useAadhaarFlow'
import { AadhaarStep } from './AadhaarStep'
import { AadhaarOtpStep } from './AadhaarOtpStep'
import { CompleteProfileStep } from './CompleteProfileStep'
import { DriverVerify } from './DriverVerify'

/**
 * /verify host (SCREENS §7). intent=driver → L2 forms; intent=l1 → the Aadhaar
 * machine, short-circuiting to profile completion when the user is already
 * Aadhaar-verified. On L1 completion routes back to /profile.
 */
export function VerifyScreen() {
  const router = useRouter()
  const intent = useSearchParams().get('intent') || 'l1'
  const { data: profile, isLoading } = useProfile()
  const flow = useAadhaarFlow()

  if (isLoading) return <div className="flex flex-1 items-center justify-center text-ec-ink40">…</div>

  if (intent === 'driver') {
    return <DriverVerify status={profile?.verification ?? { dlSubmitted: false, rcSubmitted: false }} />
  }

  const alreadyVerified = Boolean(profile?.verification?.aadhaarVerified)
  if (alreadyVerified || flow.phase === 'done') {
    return <CompleteProfileStep verifiedName={flow.verifiedName} onDone={() => router.push('/profile')} />
  }
  if (flow.phase === 'otp') {
    return <AadhaarOtpStep onSubmit={flow.submitOtp} onResend={() => flow.resend('')} onBack={flow.back} loading={flow.loading} errorKey={flow.errorKey} />
  }
  return <AadhaarStep onSubmit={flow.submitAadhaar} loading={flow.loading} errorKey={flow.errorKey} />
}
