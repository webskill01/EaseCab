'use client'

const REASON_LABEL = {
  fake: 'Fake', spam: 'Spam', wrong_info: 'Wrong info', inappropriate: 'Inappropriate', other: 'Other',
}

/**
 * One reported user + all their open reports. `reinstate` un-hides the driver (clears
 * the auto-hide flag); `uphold` keeps them hidden. Both resolve every report shown.
 */
export function UserReportCard({ item, onAction }) {
  const { user, reportCount, reports } = item
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-semibold text-ec-ink">{user.name ?? '—'}</span>
          {user.flagged && <span className="ml-2 rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Hidden</span>}
          <span className="ml-2 text-sm text-ec-ink60">{[user.baseCity, user.vehicleType].filter(Boolean).join(' · ') || '—'}</span>
        </div>
        <span className="text-xs text-ec-ink60">{reportCount} report{reportCount === 1 ? '' : 's'}</span>
      </div>

      <ul className="mt-3 flex flex-col gap-2">
        {reports.map((r) => (
          <li key={r.id} className="rounded-md bg-muted px-3 py-2 text-sm">
            <span className="rounded bg-card px-2 py-0.5 text-xs font-semibold uppercase text-ec-ink">{REASON_LABEL[r.reason] ?? r.reason}</span>
            <span className="ml-2 text-ec-ink60">by {r.reporter.name ?? '—'} {r.reporter.phoneMasked}</span>
            {r.remarks && <p className="mt-1 text-ec-ink">{r.remarks}</p>}
            {r.screenshotUrl && (
              <a href={r.screenshotUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-ec-blue underline">Screenshot</a>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex gap-2">
        <button type="button" onClick={() => onAction(user.id, 'reinstate')} className="rounded-md border px-3 py-1.5 text-sm font-medium text-ec-ink">
          Reinstate
        </button>
        <button type="button" onClick={() => onAction(user.id, 'uphold')} className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white">
          Keep hidden
        </button>
      </div>
    </div>
  )
}
