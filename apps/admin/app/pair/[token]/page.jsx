'use client'

import { useParams } from 'next/navigation'
import { usePairing } from '@/features/wa-sessions/hooks/useWaSessions'
import { PairPanel } from '@/features/wa-sessions/components/PairPanel'
import { card } from '@/lib/ui'

/**
 * Public scanner page (no login): an admin shares /pair/<token> so someone with the
 * phone can link it remotely. The token is the only credential (30 min, used up once linked).
 */
export default function PublicPairPage() {
  const { token } = useParams()
  const { state, isError } = usePairing({ token })

  return (
    <main className="flex min-h-screen items-start justify-center bg-slate-50 px-4 py-10">
      <div className={`${card} w-full max-w-md space-y-4`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- static brand icon */}
        <img src="/logo.png" alt="EaseCab" className="h-10 w-10" />
        {isError && !state ? (
          <p className="text-sm text-ec-ink60">This link has expired or was already used. Ask for a new one.</p>
        ) : (
          <>
            <div>
              <h1 className="text-lg font-bold text-ec-ink">Link WhatsApp to EaseCab</h1>
              {state?.name && <p className="text-sm text-ec-ink60">Session: <b>{state.name}</b></p>}
            </div>
            <PairPanel token={token} />
            <p className="text-[11px] text-ec-ink40">EaseCab only reads ride posts from your groups. It never sends messages from your number.</p>
          </>
        )}
      </div>
    </main>
  )
}
