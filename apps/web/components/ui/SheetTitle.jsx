'use client'

/**
 * Bottom-sheet header (sheets.jsx SheetTitle) — a left-aligned 44px icon tile next
 * to the title + optional sub, on one row. Shared so every sheet speaks the same
 * visual language instead of each hand-rolling a centered hero.
 *
 * @param {object} props
 * @param {React.ReactNode} [props.icon] - tile glyph; omit for a title-only header
 * @param {'blue'|'sky'|'success'|'blueInk'|'danger'} [props.tone] - tile colour
 * @param {string} props.title
 * @param {string} [props.sub]
 */
const TONES = {
  blue: 'bg-ec-blue text-white',
  sky: 'bg-ec-sky text-ec-blue',
  success: 'bg-ec-successBg text-ec-success',
  blueInk: 'bg-ec-blueInk text-white',
  danger: 'bg-ec-dangerBg text-ec-danger',
}

export function SheetTitle({ icon, tone = 'blue', title, sub }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      {icon ? (
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${TONES[tone]}`}>{icon}</span>
      ) : null}
      <div className="min-w-0 flex-1">
        <h2 className="text-[18px] font-extrabold leading-tight tracking-tight text-ec-ink">{title}</h2>
        {sub ? <p className="mt-[3px] text-[13.5px] font-medium leading-snug text-ec-ink60">{sub}</p> : null}
      </div>
    </div>
  )
}
