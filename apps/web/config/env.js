import { z } from 'zod'

/**
 * Public web env schema. NEXT_PUBLIC_* vars are inlined by Next at build time, so
 * each must be referenced statically. Validated at import — a misconfigured build
 * fails loudly (CLAUDE.md §3). Firebase client config is public by design (it
 * gates by domain, not secrecy); the Admin SDK secrets stay server-side.
 */
const schema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_VAPID_KEY: z.string().min(1),
  // Support contact (top-bar headset → WhatsApp, else email). WhatsApp number is
  // digits only incl. country code, e.g. 919876543210. Both optional.
  NEXT_PUBLIC_SUPPORT_WHATSAPP: z.string().regex(/^\d{10,15}$/).optional(),
  NEXT_PUBLIC_SUPPORT_EMAIL: z.string().email().default('support@easecab.com'),
})

const parsed = schema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  NEXT_PUBLIC_FIREBASE_VAPID_KEY: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
  NEXT_PUBLIC_SUPPORT_WHATSAPP: process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP,
  NEXT_PUBLIC_SUPPORT_EMAIL: process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
})

if (!parsed.success) {
  throw new Error(
    `Invalid web environment: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`,
  )
}

export const env = parsed.data
