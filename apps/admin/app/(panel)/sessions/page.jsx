'use client'

import { useState } from 'react'
import { Smartphone, Plus } from 'lucide-react'
import { useWaSessions } from '@/features/wa-sessions/hooks/useWaSessions'
import { SessionCard } from '@/features/wa-sessions/components/SessionCard'
import { PageHeader } from '@/features/shell/components/PageHeader'
import { QueryState } from '@/features/shell/components/QueryState'
import { button, pill, input } from '@/lib/ui'

/** Add-a-session row: name it, then link it from its card. */
function AddSession({ create, disabled, nextNumber }) {
  const [name, setName] = useState('')
  // Name is optional: a blank one becomes "Number N" (rename it later from the card).
  const add = () => create.mutate(name.trim() || `Number ${nextNumber}`, { onSuccess: () => setName('') })
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <input
        value={name}
        maxLength={40}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !disabled && add()}
        placeholder='Name (optional), e.g. "Ambala groups"'
        className={`${input} sm:w-80`}
      />
      <button type="button" disabled={disabled || create.isPending} onClick={add} className={button({ variant: 'primary' })}>
        <Plus size={15} /> Add session
      </button>
      {create.isError && <p className="self-center text-xs font-medium text-red-600">{create.error?.message || 'Could not add.'}</p>}
    </div>
  )
}

export default function SessionsPage() {
  const w = useWaSessions()
  const live = w.sessions.filter((s) => s.status === 'live').length

  return (
    <div>
      <PageHeader
        icon={Smartphone}
        title="WhatsApp Sessions"
        description="Every number the bot reads rides from. All live sessions run together, and a ride posted in a group two numbers share is saved once. Add a session, then link it by QR, pairing code, or a share link."
        actions={
          <>
            <span className={pill({ tone: 'green' })}>{live} live</span>
            <span className={pill({ tone: 'slate' })}>{w.sessions.length}/{w.totals.max} sessions</span>
            <span className={pill({ tone: 'blue' })}>{w.totals.groups} groups covered</span>
          </>
        }
      />

      <AddSession create={w.create} nextNumber={w.sessions.length + 1} disabled={w.sessions.length >= w.totals.max && w.totals.max > 0} />

      <div className="mt-4">
        <QueryState
          isLoading={w.isLoading}
          isError={w.isError}
          isEmpty={w.sessions.length === 0}
          errorMessage="Failed to load sessions."
          emptyMessage="No sessions yet"
          emptyHint="Add one above, then link a WhatsApp number to it."
        >
          <ul className="space-y-3">
            {w.sessions.map((s) => <SessionCard key={s.id} s={s} update={w.update} remove={w.remove} />)}
          </ul>
        </QueryState>
      </div>
    </div>
  )
}
