'use client'

import { useState } from 'react'
import { HeartHandshake } from 'lucide-react'
import { useFreeMembers } from '@/features/freeMembers/hooks/useFreeMembers'
import { PageHeader } from '@/features/shell/components/PageHeader'
import { QueryState } from '@/features/shell/components/QueryState'
import { button, pill, input, card } from '@/lib/ui'

const MONTHS = [0, 1, 2, 3, 6, 12]
const date = (iso) => new Date(iso).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium' })

function AddForm({ add }) {
  const [phone, setPhone] = useState('')
  const [months, setMonths] = useState(1)
  const [note, setNote] = useState('')
  const submit = (e) => {
    e.preventDefault()
    add.mutate({ phone, months, note: note.trim() }, { onSuccess: () => { setPhone(''); setNote('') } })
  }

  return (
    <form onSubmit={submit} className={`${card} mb-6 grid gap-3 sm:grid-cols-[1fr_auto_1.5fr_auto] sm:items-end`}>
      <label className="text-xs font-medium text-ec-ink60">
        Mobile number
        <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="98765 43210" className={`${input} mt-1`} />
      </label>
      <label className="text-xs font-medium text-ec-ink60">
        Free time
        <select value={months} onChange={(e) => setMonths(Number(e.target.value))} className={`${input} mt-1 pr-8`}>
          {MONTHS.map((m) => <option key={m} value={m}>{m === 0 ? 'None (already given)' : `${m} month${m > 1 ? 's' : ''}`}</option>)}
        </select>
      </label>
      <label className="text-xs font-medium text-ec-ink60">
        Why (optional)
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Barter, helped with groups…" className={`${input} mt-1`} />
      </label>
      <button type="submit" disabled={add.isPending || phone.trim().length < 10} className={button({ variant: 'primary' })}>
        Add
      </button>
    </form>
  )
}

function Row({ m, remove }) {
  const [confirm, setConfirm] = useState(false)
  return (
    <li className="flex flex-col gap-2 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium text-ec-ink">{m.name || 'No name'} <span className="text-ec-ink60">({m.phoneMasked})</span></p>
        <p className="mt-0.5 text-xs text-ec-ink60">
          {m.monthsGranted} month{m.monthsGranted === 1 ? '' : 's'} given · added {date(m.addedAt)}{m.note ? ` · ${m.note}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className={pill({ tone: m.validUntil ? 'green' : 'slate' })}>{m.validUntil ? `Active till ${date(m.validUntil)}` : 'Plan ended'}</span>
        {confirm ? (
          <>
            <button type="button" className={button({ variant: 'danger', size: 'sm' })} disabled={remove.isPending} onClick={() => remove.mutate(m.userId)}>Confirm</button>
            <button type="button" className={button({ variant: 'ghost', size: 'sm' })} onClick={() => setConfirm(false)}>Cancel</button>
          </>
        ) : (
          <button type="button" className={button({ variant: 'dangerOutline', size: 'sm' })} onClick={() => setConfirm(true)}>Remove</button>
        )}
      </div>
    </li>
  )
}

export default function FreeMembersPage() {
  const f = useFreeMembers()
  return (
    <div>
      <PageHeader
        icon={HeartHandshake}
        title="Free members"
        count={f.items.length}
        description="People you gave a free plan for barter or help. They can contact rides like any member, but never count in signups, paid accounts, revenue, MRR or active paid. Removing someone keeps their plan time; they just count in stats again."
      />
      <AddForm add={f.add} />
      <QueryState
        isLoading={f.isLoading}
        isError={f.isError}
        isEmpty={f.items.length === 0}
        errorMessage="Failed to load free members."
        emptyMessage="No free members yet"
        emptyHint="Add someone above to give them free months and keep them out of the stats."
      >
        <ul className="divide-y divide-ec-line overflow-hidden rounded-ec-card border border-ec-line bg-white shadow-ec-card">
          {f.items.map((m) => <Row key={m.userId} m={m} remove={f.remove} />)}
        </ul>
      </QueryState>
    </div>
  )
}
