'use client'

import { useState } from 'react'
import { useBotFilters } from '@/features/bot-filters/hooks/useBotFilters'

// Mirrors shared BOT_FILTER_LIST (the admin app doesn't bundle @easecab/shared).
const LISTS = [
  { id: 'blocked_phone', label: 'Blocked numbers', hint: 'Numbers inside message text. Paste any format, one or many: +91 98765 43210, 098765-43210, 0091 9876543210, (+91) 98765.43210, Hindi/Punjabi digits; separate with commas, spaces, new lines, / or |. Also sent to the fleet panel.' },
  { id: 'blocked_sender', label: 'Blocked senders', hint: 'WhatsApp sender numbers. Same formats as blocked numbers. Also sent to the fleet panel.' },
  { id: 'ignore_keyword', label: 'Ignore words', hint: 'A message containing any of these is dropped. Also sent to the fleet panel.' },
  { id: 'ride_keyword', label: 'Ride words', hint: 'Words that mark a message as a ride.' },
  { id: 'branding', label: 'Stamps', hint: 'Exact trailing "Forwarded Duty" lines stripped before dedup. Keep in sync with the fleet.' },
]

function AddResult({ result }) {
  const parts = [`Added ${result.added}`]
  if (result.duplicates > 0) parts.push(`${result.duplicates} already listed`)
  if (result.invalid.length > 0) parts.push(`not a number: ${result.invalid.join(', ')}`)
  return <p className="mt-1 text-xs text-ec-ink60">{parts.join(' · ')}</p>
}

export default function BotFiltersPage() {
  const f = useBotFilters(LISTS[0].id)
  const [value, setValue] = useState('')
  const current = LISTS.find((l) => l.id === f.list)

  const submit = (e) => {
    e.preventDefault()
    if (value.trim()) f.add.mutate(value, { onSuccess: () => setValue('') })
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-ec-ink">
        Bot Filters <span className="text-sm font-normal text-ec-ink60">({f.total})</span>
      </h1>
      <p className="mt-1 text-sm text-ec-ink60">Changes reach the WhatsApp bot within seconds. No restart needed.</p>

      <div className="mt-4 flex gap-2 overflow-x-auto">
        {LISTS.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => { f.setList(l.id); f.add.reset() }}
            className={`shrink-0 rounded-md border px-3 py-1.5 text-sm ${l.id === f.list ? 'bg-ec-ink text-white' : 'text-ec-ink'}`}
          >
            {l.label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={500}
          placeholder={`Add to ${current.label.toLowerCase()}`}
          className="flex-1 rounded-md border px-3 py-2 text-sm"
        />
        <button type="submit" disabled={f.add.isPending} className="rounded-md bg-ec-ink px-4 py-2 text-sm text-white disabled:opacity-40">
          Add
        </button>
      </form>
      <p className="mt-1 text-xs text-ec-ink60">{current.hint}</p>
      {f.add.data && <AddResult result={f.add.data} />}
      {f.add.isError && <p className="mt-1 text-xs text-red-600">{f.add.error.message}</p>}
      {f.remove.isError && <p className="mt-1 text-xs text-red-600">{f.remove.error.message}</p>}

      <input
        value={f.q}
        onChange={(e) => f.setQ(e.target.value)}
        placeholder="Search"
        className="mt-4 w-full rounded-md border px-3 py-2 text-sm sm:w-64"
      />

      {f.isLoading && <p className="mt-4 text-sm text-ec-ink60">Loading…</p>}
      {f.isError && <p className="mt-4 text-sm text-red-600">Failed to load the list.</p>}
      {!f.isLoading && !f.isError && f.items.length === 0 && <p className="mt-4 text-sm text-ec-ink60">Nothing here.</p>}

      {f.items.length > 0 && (
        <ul className="mt-3 divide-y rounded-md border bg-card">
          {f.items.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="break-all text-ec-ink">{row.value}</span>
              <button
                type="button"
                disabled={f.remove.isPending}
                onClick={() => f.remove.mutate(row.id)}
                className="shrink-0 rounded-md border px-2 py-1 text-xs text-red-600 disabled:opacity-40"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {f.total > f.limit && (
        <div className="mt-4 flex items-center gap-2 text-sm">
          <button type="button" disabled={f.page <= 1} onClick={() => f.setPage(f.page - 1)} className="rounded-md border px-3 py-1.5 text-ec-ink disabled:opacity-40">Prev</button>
          <span className="text-ec-ink60">Page {f.page} of {Math.ceil(f.total / f.limit)}</span>
          <button type="button" disabled={f.page * f.limit >= f.total} onClick={() => f.setPage(f.page + 1)} className="rounded-md border px-3 py-1.5 text-ec-ink disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  )
}
