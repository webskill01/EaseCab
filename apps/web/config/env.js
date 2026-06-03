import { z } from 'zod'

/**
 * Public web env schema. NEXT_PUBLIC_* vars are inlined by Next at build time,
 * so each must be referenced statically (process.env.NEXT_PUBLIC_X). Validated
 * at module import — a misconfigured build/runtime fails loudly (CLAUDE.md §3).
 */
const schema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
})

const parsed = schema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
})

if (!parsed.success) {
  throw new Error(
    `Invalid web environment: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`,
  )
}

/** @type {{ NEXT_PUBLIC_API_URL: string }} */
export const env = parsed.data
