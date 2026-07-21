/**
 * GET /api/auth/invite/:token — validate token cho page /register.
 * Trả email + trạng thái valid để form hiển thị "Đăng ký cho <email>".
 * KHÔNG trả token, KHÔNG trả invite id — chỉ cần email + ok.
 */

import { and, eq, isNull } from 'drizzle-orm'
import { coreInvites } from '~~/server/database/schema'
import { tokenParamSchema } from '#shared/schemas/auth'

export default defineEventHandler(async (event) => {
  const raw = getRouterParam(event, 'token')
  const parsed = tokenParamSchema.safeParse(raw)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Token không hợp lệ' })
  }

  const db = useDB()
  const now = Date.now()

  const tokenHash = await hashToken(parsed.data)
  const [invite] = await db
    .select({ email: coreInvites.email, expiresAt: coreInvites.expiresAt })
    .from(coreInvites)
    .where(and(eq(coreInvites.tokenHash, tokenHash), isNull(coreInvites.usedAt)))
    .limit(1)

  if (!invite) {
    throw createError({ statusCode: 404, statusMessage: 'Invite không tồn tại hoặc đã dùng' })
  }
  if (invite.expiresAt < now) {
    throw createError({ statusCode: 410, statusMessage: 'Invite đã hết hạn' })
  }

  return { ok: true, email: invite.email }
})
