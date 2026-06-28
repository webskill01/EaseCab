'use client'

const REASON_LABEL = {
  fake: 'Fake', spam: 'Spam', wrong_info: 'Wrong info', inappropriate: 'Inappropriate', other: 'Other',
}

export function ReportCard({ item, onAction }) {
  const { reporter, target } = item
  const route = target ? [target.fromCity, target.toCity].filter(Boolean).join(' → ') || '—' : 'target gone'
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 break-words">
          <span className="rounded bg-muted px-2 py-0.5 text-xs font-semibold uppercase text-ec-ink">
            {REASON_LABEL[item.reason] ?? item.reason}
          </span>
          {target && (
            <span className="ml-2 rounded bg-muted px-2 py-0.5 text-xs text-ec-ink60">{target.kind}</span>
          )}
          <span className="ml-2 text-sm text-ec-ink60">by {reporter.name ?? '—'}</span>
          <span className="ml-1 text-sm text-ec-ink60">{reporter.phoneMasked}</span>
        </div>
      </div>

      <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 break-words text-sm text-ec-ink60 sm:grid-cols-2">
        <div><dt className="inline">Route: </dt><dd className="inline text-ec-ink">{route}</dd></div>
        <div><dt className="inline">Ride status: </dt><dd className="inline text-ec-ink">{target?.status ?? '—'}</dd></div>
        {target?.displayText && <div className="col-span-2"><dt className="inline">Text: </dt><dd className="inline text-ec-ink">{target.displayText}</dd></div>}
        {target?.posterName && <div><dt className="inline">Poster: </dt><dd className="inline text-ec-ink">{target.posterName}</dd></div>}
        {item.remarks && <div className="col-span-2"><dt className="inline">Remarks: </dt><dd className="inline text-ec-ink">{item.remarks}</dd></div>}
      </dl>

      {item.screenshotUrl && (
        <a href={item.screenshotUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-ec-blue underline">
          Screenshot
        </a>
      )}

      <div className="mt-4 flex gap-2">
        <button type="button" onClick={() => onAction(item.id, 'dismiss')} className="rounded-md border px-3 py-1.5 text-sm font-medium text-ec-ink">
          Dismiss
        </button>
        <button type="button" onClick={() => onAction(item.id, 'remove')} className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white">
          Remove ride
        </button>
      </div>
    </div>
  )
}
