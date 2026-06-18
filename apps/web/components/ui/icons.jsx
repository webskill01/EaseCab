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

/** CheckCheck — double tick (message read). */
export function CheckCheck({ size = 16, className }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...base} strokeWidth={2.4}>
      <path d="M1 13l4 4L15 7" />
      <path d="M9 13l4 4L23 7" />
    </svg>
  )
}

/** ChevronLeft — back navigation. */
export function ChevronLeft({ size = 22, className }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...base} strokeWidth={2.4}>
      <path d="M15 18 9 12l6-6" />
    </svg>
  )
}

/** Send — paper-plane composer action. */
export function Send({ size = 18, className }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...base} strokeWidth={2.2}>
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4 20-7z" />
    </svg>
  )
}

/** Trash — delete. */
export function Trash({ size = 16, className }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...base} strokeWidth={2}>
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  )
}

/** Repeat — repost. */
export function Repeat({ size = 16, className }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...base} strokeWidth={2}>
      <path d="m17 2 4 4-4 4" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="m7 22-4-4 4-4" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </svg>
  )
}

/** Pencil — edit affordance. */
export function Pencil({ size = 16, className }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...base} strokeWidth={1.9}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
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

/** Swap / route arrows — pickup ↔ drop. */
export function Swap({ size = 22, className }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...base} strokeWidth={2}>
      <path d="M4 8h13l-3-3M20 16H7l3 3" />
    </svg>
  )
}

/** WhatsApp (filled) — contact channel. */
export function Whatsapp({ size = 17, className }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.97L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm5.52 11.97c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.51.11-.11.25-.29.37-.43.13-.14.17-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.16 0-.43.06-.65.31-.22.25-.86.84-.86 2.05s.88 2.38 1 2.54c.12.16 1.73 2.64 4.19 3.7.58.25 1.04.4 1.4.51.59.19 1.12.16 1.54.1.47-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28z" />
    </svg>
  )
}

/** Phone — call channel. */
export function Phone({ size = 16, className }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...base} strokeWidth={1.9}>
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
    </svg>
  )
}

/** Flag — report. */
export function Flag({ size = 17, className }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...base} strokeWidth={1.9}>
      <path d="M4 22V4M4 4h11l-1.5 4L15 12H4" />
    </svg>
  )
}

/** Speech bubble — chat / messages. */
export function Chat({ size = 21, className }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...base}>
      <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 9.7 9.7 0 0 1-3.9-.8L3 21l1.8-4.6A8.38 8.38 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z" />
    </svg>
  )
}

/** Globe — language switcher. */
export function Globe({ size = 16, className }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
    </svg>
  )
}

/** Headset — support. */
export function Headset({ size = 18, className }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...base}>
      <path d="M4 13v-1a8 8 0 0 1 16 0v1" />
      <path d="M4 13a2 2 0 0 1 2 2v2a2 2 0 0 1-4 0v-2a2 2 0 0 1 2-2zM20 13a2 2 0 0 0-2 2v2a2 2 0 0 0 4 0v-2a2 2 0 0 0-2-2z" />
      <path d="M20 17v1a3 3 0 0 1-3 3h-3" />
    </svg>
  )
}

/** Crown (filled) — trial / upgrade accent. */
export function Crown({ size = 18, className }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
      <path d="M3 7l4 4 5-7 5 7 4-4-1.5 12h-15L3 7z" />
    </svg>
  )
}

/** Info circle — banners / toasts. */
export function Info({ size = 18, className }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...base} strokeWidth={1.9}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <circle cx="12" cy="7.6" r="0.6" fill="currentColor" />
    </svg>
  )
}

/** Magnifier — city search. */
export function Search({ size = 18, className }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...base} strokeWidth={1.9}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

/** Plus — Post tab. */
export function Plus({ size = 24, className }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...base} strokeWidth={2.2}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

/** List — My Rides tab. */
export function List({ size = 22, className }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...base}>
      <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
    </svg>
  )
}

/** Car — sedan/hatchback/auto. */
export function Car({ size = 16, className }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...base} strokeWidth={1.7}>
      <path d="M5 17h14M5 17a2 2 0 0 1-2-2v-3l2-5h12l2 5v3a2 2 0 0 1-2 2M5 17v2M19 17v2M3.5 12h17" />
      <circle cx="7.5" cy="14.5" r="0.6" fill="currentColor" />
      <circle cx="16.5" cy="14.5" r="0.6" fill="currentColor" />
    </svg>
  )
}

/** Van — tempo traveller / urbania. */
export function Van({ size = 16, className }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...base} strokeWidth={1.7}>
      <path d="M2 16V7a1 1 0 0 1 1-1h11l5 4v6M2 16h2m14 0h2M2 16v2m18-2v2M4 6v10" />
      <circle cx="6.5" cy="16.5" r="1.4" />
      <circle cx="17.5" cy="16.5" r="1.4" />
      <path d="M9 6v4M2 10h6" />
    </svg>
  )
}

/** Bus. */
export function Bus({ size = 16, className }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...base} strokeWidth={1.7}>
      <rect x="4" y="4" width="16" height="13" rx="2" />
      <path d="M4 11h16M8 17v2M16 17v2M9 4v7M15 4v7" />
      <circle cx="8" cy="14" r="0.6" fill="currentColor" />
      <circle cx="16" cy="14" r="0.6" fill="currentColor" />
    </svg>
  )
}

/** SUV — innova / bolero / 7-seater. */
export function Suv({ size = 16, className }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...base} strokeWidth={1.7}>
      <path d="M3 16v-3l1.5-4a2 2 0 0 1 1.9-1.4h7.2a2 2 0 0 1 1.6.8L19 11l2 1v4M3 16h2m14 0h2M3 16v2m18-2v2M3 12h18M11 7.6V12" />
      <circle cx="7.5" cy="16" r="1.4" />
      <circle cx="16.5" cy="16" r="1.4" />
    </svg>
  )
}

/**
 * Vehicle glyph by icon key (the `rideView.vehIconKey` output). Falls back to a
 * generic car. Tint via the parent's text color.
 */
const VEHICLE_GLYPH = { tt: Van, sedan: Car, suv: Suv, bus: Bus, car: Car }
export function VehicleIcon({ vehicleKey, size = 16, className }) {
  const Glyph = VEHICLE_GLYPH[vehicleKey] || Car
  return <Glyph size={size} className={className} />
}
