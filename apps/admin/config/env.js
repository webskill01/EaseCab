import { z } from 'zod'

/**
 * Public admin env schema. The admin panel needs only the API base URL (no Firebase
 * — admin auth is email+password against our own API). Validated at import so a
 * misconfigured build fails loudly (CLAUDE.md §3).
 */
const schema = z.object({ NEXT_PUBLIC_API_URL: z.string().url() })

const parsed = schema.safeParse({ NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL })

if (!parsed.success) {
  throw new Error(`Invalid admin env: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`)
}

export const env = parsed.data
