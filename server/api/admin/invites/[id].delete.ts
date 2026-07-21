/**
 * DELETE /api/admin/invites/:id — revoke invite chưa dùng.
 * Xoá hẳn row (không cần audit trail cho scope cá nhân).
 */

import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { coreInvites } from '~~/server/database/schema'

const idSchema = z.coerce.number().int().positive()

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const raw = getRouterParam(event, 'id')
  const parsed = idSchema.safeParse(raw)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid invite id' })
  }

  const db = useDB()
  await db.delete(coreInvites).where(eq(coreInvites.id, parsed.data))

  return { ok: true }
})
