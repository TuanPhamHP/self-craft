/**
 * GET /api/admin/invites — list invite (mới nhất trước).
 * Trả email, expiresAt, usedAt, createdAt — KHÔNG trả tokenHash (không cần cho UI, giảm surface).
 */

import { desc } from 'drizzle-orm'
import { coreInvites } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = useDB()

  const rows = await db
    .select({
      id: coreInvites.id,
      email: coreInvites.email,
      expiresAt: coreInvites.expiresAt,
      usedAt: coreInvites.usedAt,
      createdAt: coreInvites.createdAt,
    })
    .from(coreInvites)
    .orderBy(desc(coreInvites.createdAt))

  return rows
})
