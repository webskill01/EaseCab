'use client'

import { ArrowRight, ImageIcon, X, Trash2 } from 'lucide-react'
import { button, pill, card, REASONS } from '@/lib/ui'
import { PhoneLink } from '@/features/shell/components/PhoneLink'

const when = (iso) => new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
const VERDICT = { dismiss: 'Dismissed', remove: 'Ride removed' }

export function ReportCard({ item, onAction }) {
  const { reporter, target } = item
  const reason = REASONS[item.reason] ?? { label: item.reason, tone: 'slate' }
  return (
    <div className={card}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={pill({ tone: reason.tone })}>{reason.label}</span>
        {target && <span className={pill({ tone: target.kind === 'posted' ? 'blue' : 'violet' })}>{target.kind}</span>}
        <span className="text-sm text-ec-ink60">by {reporter.name ?? '—'}</span>
        <PhoneLink phone={reporter.phone} />
      </div>

      <div className="mt-3 rounded-xl bg-slate-50 p-3">
        {target ? (
          <div className="flex flex-wrap items-center gap-2 font-semibold text-ec-ink">
            <span>{target.fromCity ?? '—'}</span>
            <ArrowRight size={15} className="text-ec-blue" />
            <span>{target.toCity ?? '—'}</span>
            {target.status && <span className={`${pill({ tone: 'slate' })} ml-auto`}>{target.status}</span>}
          </div>
        ) : (
          <p className="text-sm italic text-ec-ink60">target gone</p>
        )}
        {target?.displayText && <p className="mt-2 break-words text-sm text-ec-ink60">{target.displayText}</p>}
        {(target?.postedAt || target?.posterName) && (
          <p className="mt-1 text-xs text-ec-ink60">
            {target.postedAt && <>Posted {when(target.postedAt)}</>}
            {target.postedAt && target.posterName && ' · '}
            {target.posterName && <>Poster: <span className="text-ec-ink">{target.posterName}</span></>}
          </p>
        )}
      </div>

      {item.remarks && <p className="mt-3 break-words border-l-2 border-amber-300 pl-3 text-sm text-ec-ink">{item.remarks}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {/* ponytail: a resolved report is final — show the verdict instead of buttons that would do nothing */}
        {item.reviewedAt ? (
          <span className="text-xs text-ec-ink60">
            <span className="font-semibold text-ec-ink">{VERDICT[item.reviewAction] ?? 'Resolved'}</span> · {when(item.reviewedAt)}
          </span>
        ) : (<>
        <button type="button" onClick={() => onAction(item.id, 'dismiss')} className={button({ size: 'sm' })}>
          <X size={14} /> Dismiss
        </button>
        <button type="button" onClick={() => onAction(item.id, 'remove')} className={button({ variant: 'danger', size: 'sm' })}>
          <Trash2 size={14} /> Remove ride
        </button>
        </>)}
        {item.screenshotUrl && (
          <a href={item.screenshotUrl} target="_blank" rel="noreferrer" className="ml-auto flex items-center gap-1 text-xs font-medium text-ec-blue hover:underline">
            <ImageIcon size={14} /> Screenshot
          </a>
        )}
      </div>
    </div>
  )
}
