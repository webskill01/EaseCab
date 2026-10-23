/** Page title row: icon tile, title + optional count chip, description, right-side actions. */
export function PageHeader({ icon: Icon, title, count, description, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ec-sky text-ec-blueDeep">
            <Icon size={18} />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-semibold tracking-tight text-ec-ink">
            {title}
            {count !== undefined && (
              <span className="rounded-full bg-ec-sky px-2 py-0.5 text-xs font-medium text-ec-blueDeep">{count}</span>
            )}
          </h1>
          {description && <p className="mt-1 text-sm text-ec-ink60">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
