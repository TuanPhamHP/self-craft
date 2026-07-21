/**
 * POST /api/auth/reset — hoàn tất reset password.
 *
 * Verify token còn hạn + chưa dùng → update password_hash → đánh dấu token used.
 * KHÔNG auto-login sau reset — user login lại bằng password mới (an toàn hơn nếu người khác đã lấy token cũ).
 */

import { and, eq, isNull } from 'drizzle-orm'
import { corePasswordResets, coreUsers } from '~~/server/database/schema'
import { resetSchema } from '#shared/schemas/auth'

export default defineEventHandler(async (event) => {
  const parsed = await readValidatedBody(event, (body) => resetSchema.safeParse(body))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid reset payload',
      data: parsed.error.issues,
    })
  }

  const { token, password } = parsed.data
  const db = useDB()
  const now = Date.now()

  const tokenHash = await hashToken(token)
  const [reset] = await db
    .select()
    .from(corePasswordResets)
    .where(and(eq(corePasswordResets.tokenHash, tokenHash), isNull(corePasswordResets.usedAt)))
    .limit(1)

  if (!reset) {
    throw createError({ statusCode: 400, statusMessage: 'Token không hợp lệ hoặc đã dùng' })
  }
  if (reset.expiresAt < now) {
    throw createError({ statusCode: 400, statusMessage: 'Token đã hết hạn' })
  }

  const passwordHash = await hashPassword(password)

  await db
    .update(coreUsers)
    .set({ passwordHash, updatedAt: now })
    .where(eq(coreUsers.id, reset.userId))

  await db
    .update(corePasswordResets)
    .set({ usedAt: now })
    .where(eq(corePasswordResets.id, reset.id))

  // Clear session (nếu đang login trên thiết bị này) — user login lại bằng password mới.
  await clearUserSession(event)

  return { ok: true }
})
