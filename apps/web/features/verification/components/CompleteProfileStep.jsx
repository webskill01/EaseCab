'use client'

import { useEffect, useState } from 'react'
import { ProfileForm } from '@/features/profile/components/ProfileForm'
import { profileToForm } from '@/features/profile/lib/profileForm'
import { useProfile } from '@/features/profile/hooks/useProfile'
import { useUpdateProfile } from '@/features/profile/hooks/useUpdateProfile'
import { readPrefill, clearPrefill } from '../lib/prefill'
import { L1SuccessBanner } from './L1SuccessBanner'

/**
 * L1 completion step: ProfileForm seeded from the current profile + the Aadhaar
 * name prefill (sessionStorage). On a successful save the prefill is cleared and
 * onDone() fires.
 * @param {{ verifiedName: ?string, onDone: () => void }} props
 */
export function CompleteProfileStep({ verifiedName, onDone }) {
  const { data: profile } = useProfile()
  const update = useUpdateProfile()
  const [prefill] = useState(() => readPrefill())

  useEffect(() => {
    if (update.saved && update.data?.profileComplete) { clearPrefill(); onDone() }
  }, [update.saved, update.data, onDone])

  const initial = profileToForm(profile)
  if (!initial.name && prefill?.name) initial.name = prefill.name

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
      <ProfileForm
        initial={initial}
        onSubmit={(body) => update.save(body)}
        submitting={update.saving}
        errorKey={update.errorKey}
        header={<L1SuccessBanner name={verifiedName || prefill?.name} />}
      />
    </div>
  )
}
