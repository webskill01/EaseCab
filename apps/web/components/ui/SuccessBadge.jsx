/**
 * Animated success tick shared by the onboarding Done screen and the ride-posted
 * screen: the circle pops in with an overshoot, a ring ripples outward, then the
 * tick draws itself. All CSS-only; every layer respects prefers-reduced-motion.
 * @param {{ circleClass?: string, ringClass?: string, size?: number, tick?: number }} props
 */
export function SuccessBadge({
  circleClass = 'bg-ec-successBg text-ec-success',
  ringClass = 'border-ec-success/40',
  size = 88,
  tick = 48,
}) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <span
        aria-hidden="true"
        className={`absolute inset-0 animate-ec-ring rounded-full border-[3px] ${ringClass} motion-reduce:hidden`}
      />
      <div
        className={`flex h-full w-full animate-ec-pop items-center justify-center rounded-full ${circleClass} motion-reduce:animate-none`}
      >
        <svg
          viewBox="0 0 24 24"
          width={tick}
          height={tick}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {/* pathLength=1 normalises the dash so the tick draws itself after the pop */}
          <path
            d="M20 6 9 17l-5-5"
            pathLength="1"
            className="animate-ec-draw motion-reduce:animate-none"
            style={{ strokeDasharray: 1 }}
          />
        </svg>
      </div>
    </div>
  )
}
