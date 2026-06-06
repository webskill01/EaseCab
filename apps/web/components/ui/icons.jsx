/**
 * EaseCab icon set — inline SVG, 24×24 viewBox, currentColor (docs/design/DESIGN-SYSTEM.md §4).
 * Ported 1:1 from the design handoff (design_handoff_easecab/app/shared.jsx `Ic`).
 * Vendored design-system primitives (same exception as components/ui/button). Tint via
 * the parent's text color; size via the `size` prop.
 */

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

/** Steering wheel — brand mark + Rides tab. */
export function Steer({ size = 22, className }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...base}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.4" />
      <path d="M12 14.4V21M9.7 11.3 4 8.5M14.3 11.3 20 8.5" />
    </svg>
  )
}

/** Chevron right. */
export function ChevR({ size = 18, className }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...base} strokeWidth={2}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

/** Chevron left — back affordance. */
export function ChevL({ size = 22, className }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...base} strokeWidth={2.2}>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  )
}

/** Check. */
export function Check({ size = 14, className }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...base} strokeWidth={2.6}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

/** Map pin — location. */
export function Pin({ size = 18, className }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...base} strokeWidth={1.9}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  )
}

/** Bell with edit notch — notifications / alerts. */
export function BellEdit({ size = 18, className }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...base} strokeWidth={1.9}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  )
}

/** User. */
export function User({ size = 22, className }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...base}>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  )
}

/** Battery — background activity. */
export function Battery({ size = 18, className }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...base}>
      <rect x="2" y="7" width="18" height="10" rx="2" />
      <path d="M22 11v2M11 10l-2 4h3l-2 0" />
    </svg>
  )
}

/** Padlock — permissions header. */
export function Lock({ size = 18, className }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...base} strokeWidth={1.9}>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

/** Shield (filled) — trust / verified. */
export function Shield({ size = 14, className }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
      <path d="M12 2l7 3v6c0 4.5-3 8.7-7 10-4-1.3-7-5.5-7-10V5l7-3z" />
      <path d="M9 12l2 2 4-4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
