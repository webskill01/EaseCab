import { cn } from '@/lib/utils'

/** Pill-style tab switcher. options: [{ id, label }]. Scrolls sideways on phones. */
export function Segmented({ options, value, onChange }) {
  return (
    <div className="max-w-full overflow-x-auto">
      <div className="inline-flex gap-1 rounded-xl bg-slate-200/70 p-1">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={cn(
              'whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
              o.id === value ? 'bg-white text-ec-ink shadow-sm' : 'text-ec-ink60 hover:text-ec-ink',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}
