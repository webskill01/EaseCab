import { cn } from '@/lib/utils'

/** Page title row: icon tile, title + optional count chip, description, right-side actions. */
export function PageHeader({ icon: Icon, title, count, description, actions, tone = 'from-ec-blue to-ec-blueInk' }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md', tone)}>
            <Icon size={20} />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold text-ec-ink sm:text-2xl">
            {title}
            {count !== undefined && (
              <span className="rounded-full bg-ec-skyDeep px-2.5 py-0.5 text-sm font-semibold text-ec-blueInk">{count}</span>
            )}
          </h1>
          {description && <p className="mt-1 text-sm text-ec-ink60">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
