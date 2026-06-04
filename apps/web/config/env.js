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
})

const parsed = schema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
})

if (!parsed.success) {
  throw new Error(
    `Invalid web environment: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`,
  )
}

export const env = parsed.data
