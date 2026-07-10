import { drizzle } from 'drizzle-orm/d1'
import * as schema from '../database/schema'

/**
 * useDB() — accessor cho D1 binding (nạp qua nitro-cloudflare-dev khi dev, CF Pages khi prod).
 * Gọi trong Nitro handler; ngoài request context sẽ throw.
 */
export function useDB() {
  const event = useEvent()
  const d1 = event.context.cloudflare?.env?.DB
  if (!d1) {
    throw createError({
      statusCode: 500,
      statusMessage: 'D1 binding "DB" not found on event.context.cloudflare.env',
    })
  }
  return drizzle(d1, { schema })
}
