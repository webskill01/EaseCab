'use client'

import { useState } from 'react'
import { Filter, Plus, Search, Trash2, Share2 } from 'lucide-react'
import { useBotFilters } from '@/features/bot-filters/hooks/useBotFilters'
import { SyncResult } from '@/features/bot-filters/components/SyncResult'
import { PageHeader } from '@/features/shell/components/PageHeader'
import { Segmented } from '@/features/shell/components/Segmented'
import { QueryState } from '@/features/shell/components/QueryState'
import { Pagination } from '@/features/shell/components/Pagination'
import { button, pill, input } from '@/lib/ui'

// Mirrors shared BOT_FILTER_LIST (the admin app doesn't bundle @easecab/shared).
// `fleet: true` = the list is shared with the fleet control panels (shared FLEET_FIELDS).
const LISTS = [
  { id: 'blocked_phone', fleet: true, label: 'Blocked numbers', hint: 'Numbers inside message text. Paste any format, one or many: +91 98765 43210, 098765-43210, 0091 9876543210, (+91) 98765.43210, Hindi/Punjabi digits; separate with commas, spaces, new lines, / or |. Also sent to the fleet panel.' },
  { id: 'blocked_sender', fleet: true, label: 'Blocked senders', hint: 'WhatsApp sender numbers. Same formats as blocked numbers. Also sent to the fleet panel.' },
  { id: 'ignore_keyword', fleet: true, label: 'Ignore words', hint: 'A message containing any of these is dropped. Also sent to the fleet panel.' },
  { id: 'ride_keyword', label: 'Ride words', hint: 'Words that mark a message as a ride.' },
  { id: 'branding', label: 'Stamps', hint: 'Exact trailing "Forwarded Duty" lines stripped before dedup. Keep in sync with the fleet.' },
]

function AddResult({ result }) {
  const parts = [`Added ${result.added}`]
  if (result.duplicates > 0) parts.push(`${result.duplicates} already listed`)
  if (result.invalid.length > 0) parts.push(`not a number: ${result.invalid.join(', ')}`)
  return <p className="mt-2 text-xs font-medium text-emerald-700">{parts.join(' · ')}</p>
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
      <PageHeader
        icon={Filter}
        title="Bot Filters"
        count={f.total}
        tone="from-slate-600 to-slate-800"
        description="Changes reach the WhatsApp bot within seconds. No restart needed."
      />

      <Segmented
        options={LISTS}
        value={f.list}
        onChange={(id) => { f.setList(id); f.add.reset(); f.remove.reset() }}
      />

      <div className="mt-4 rounded-ec-card border border-ec-line bg-white p-4 shadow-ec-card sm:p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="font-semibold text-ec-ink">{current.label}</h2>
          {current.fleet && <span className={pill({ tone: 'violet' })}><Share2 size={12} />fleet-synced</span>}
        </div>
        <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
          <input value={value} onChange={(e) => setValue(e.target.value)} maxLength={500} placeholder={`Add to ${current.label.toLowerCase()}`} className={input} />
          <button type="submit" disabled={f.add.isPending} className={button({ variant: 'primary' })}>
            <Plus size={15} /> Add
          </button>
        </form>
        <p className="mt-2 text-xs text-ec-ink60">{current.hint}</p>
        {f.add.data && <AddResult result={f.add.data} />}
        {current.fleet && f.add.data && <SyncResult peers={f.add.data.peers} />}
        {current.fleet && f.remove.data && <SyncResult peers={f.remove.data.peers} />}
      </div>

      <div className="relative mt-4 sm:w-72">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ec-ink40" />
        <input value={f.q} onChange={(e) => f.setQ(e.target.value)} placeholder="Search" className={`${input} pl-9`} />
      </div>

      <div className="mt-3">
        <QueryState isLoading={f.isLoading} isError={f.isError} isEmpty={f.items.length === 0} errorMessage="Failed to load the list." emptyMessage="Nothing here.">
          <ul className="divide-y divide-ec-line overflow-hidden rounded-ec-card border border-ec-line bg-white shadow-ec-card">
            {f.items.map((row) => (
              <li key={row.id} className="group flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-ec-sky/50">
                <span className="break-all font-mono text-ec-ink">{row.value}</span>
                <button
                  type="button"
                  disabled={f.remove.isPending}
                  onClick={() => f.remove.mutate(row.id)}
                  aria-label={`Remove ${row.value}`}
                  className={`${button({ variant: 'ghost', size: 'sm' })} shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700`}
                >
                  <Trash2 size={14} /> Remove
                </button>
              </li>
            ))}
          </ul>
        </QueryState>
      </div>

      <Pagination page={f.page} total={f.total} limit={f.limit} onChange={f.setPage} />
    </div>
  )
}
