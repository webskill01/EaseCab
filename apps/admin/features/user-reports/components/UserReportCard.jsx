'use client'

import { ImageIcon, Eye, EyeOff } from 'lucide-react'
import { Avatar } from '@/features/shell/components/Avatar'
import { button, pill, card, REASONS } from '@/lib/ui'

/**
 * One reported user + all their open reports. `reinstate` un-hides the driver (clears
 * the auto-hide flag); `uphold` keeps them hidden. Both resolve every report shown.
 */
export function UserReportCard({ item, onAction }) {
  const { user, reportCount, reports } = item
  return (
    <div className={card}>
      <div className="flex items-start gap-3">
        <Avatar name={user.name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-ec-ink">{user.name ?? '—'}</span>
            {user.flagged && <span className={pill({ tone: 'red' })}>Hidden</span>}
          </div>
          <p className="mt-0.5 text-sm text-ec-ink60">{[user.baseCity, user.vehicleType].filter(Boolean).join(' · ') || '—'}</p>
        </div>
        <span className={pill({ tone: 'amber' })}>{`${reportCount} report${reportCount === 1 ? '' : 's'}`}</span>
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {reports.map((r) => {
          const reason = REASONS[r.reason] ?? { label: r.reason, tone: 'slate' }
          return (
            <li key={r.id} className="rounded-xl bg-slate-50 px-3 py-2.5 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className={pill({ tone: reason.tone })}>{reason.label}</span>
                <span className="text-ec-ink60">by {r.reporter.name ?? '—'} {r.reporter.phoneMasked}</span>
                {r.screenshotUrl && (
                  <a href={r.screenshotUrl} target="_blank" rel="noreferrer" className="ml-auto flex items-center gap-1 text-xs font-medium text-ec-blue hover:underline">
                    <ImageIcon size={13} /> Screenshot
                  </a>
                )}
              </div>
              {r.remarks && <p className="mt-1.5 break-words text-ec-ink">{r.remarks}</p>}
            </li>
          )
        })}
      </ul>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => onAction(user.id, 'reinstate')} className={button({ variant: 'success', size: 'sm' })}>
          <Eye size={14} /> Reinstate
        </button>
        <button type="button" onClick={() => onAction(user.id, 'uphold')} className={button({ variant: 'danger', size: 'sm' })}>
          <EyeOff size={14} /> Keep hidden
        </button>
      </div>
    </div>
  )
}
