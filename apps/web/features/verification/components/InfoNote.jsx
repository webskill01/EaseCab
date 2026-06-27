import { Info } from '@/components/ui/icons'

/**
 * Sky info-note box shown at the top of the verify-flow screens (mockup
 * verification.jsx BPNoteLite) — a short explanation of what's being verified.
 * @param {{ icon?: React.ReactNode, children: React.ReactNode }} props
 */
export function InfoNote({ icon, children }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-ec-sky px-3.5 py-3">
      <span className="mt-0.5 inline-flex shrink-0 text-ec-blue">{icon ?? <Info size={16} />}</span>
      <p className="text-[12.5px] font-semibold leading-snug text-ec-blueInk">{children}</p>
    </div>
  )
}
