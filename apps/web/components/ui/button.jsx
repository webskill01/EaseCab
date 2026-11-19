import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * EaseCab button — the single source of truth for app buttons (P13-10). Variants and
 * sizes are derived from the patterns already used across the app (ec-* tokens, not
 * shadcn): primary = the blue CTA, danger = destructive confirms, outline = the sheet
 * "cancel", ghost = quiet text actions. Tap feedback (active:scale) is baked in, so
 * callers never re-add it. Layout (w-full / flex-1) stays a per-use `className`.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 min-w-0 rounded-xl text-center leading-tight font-extrabold transition active:scale-[0.97] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-blue/40 disabled:pointer-events-none disabled:opacity-60 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-ec-blue text-white shadow-ec-blue hover:bg-ec-blue/95',
        danger: 'bg-ec-danger text-white hover:bg-ec-danger/95',
        wa: 'bg-ec-wa text-white hover:bg-ec-wa/95',
        outline: 'border-[1.5px] border-ec-line bg-white text-ec-ink hover:bg-ec-bg',
        ghost: 'text-ec-ink hover:bg-ec-bg',
      },
      size: {
        // min-h (not h) + wrap-friendly: a long Hinglish label grows a line instead of
        // spilling past a flex-1 half-width sheet button (horizontal-scroll bug).
        sm: 'min-h-9 px-3 py-1.5 text-[13px]',
        md: 'min-h-11 px-4 py-2 text-[14px]',
        lg: 'min-h-12 px-4 py-2 text-[14px] sm:text-[15px]',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
