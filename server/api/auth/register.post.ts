/**
 * POST /api/auth/register — tạo tài khoản mới.
 *
 * 2 nhánh:
 *  A. body.token có → validate invite (token_hash + expires_at + used_at) → dùng email từ invite.
 *  B. body.token empty → bootstrap first-user: chỉ được khi DB users rỗng; user này auto isAdmin.
 *
 * Sau khi tạo user: đánh dấu invite usedAt, setUserSession, redirect (client).
 */

import { and, eq, isNull, sql } from 'drizzle-orm'
import { coreInvites, coreUsers } from '~~/server/database/schema'
import { registerSchema } from '#shared/schemas/auth'

export default defineEventHandler(async (event) => {
  const parsed = await readValidatedBody(event, (body) => registerSchema.safeParse(body))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid register payload',
      data: parsed.error.issues,
    })
  }

  const { token, email: bodyEmail, password } = parsed.data
  const db = useDB()
  const now = Date.now()

  let email: string
  let isAdmin: boolean
  let inviteIdToConsume: number | null = null

  if (token) {
    // Nhánh A — invite
    const tokenHash = await hashToken(token)
    const [invite] = await db
      .select()
      .from(coreInvites)
      .where(and(eq(coreInvites.tokenHash, tokenHash), isNull(coreInvites.usedAt)))
      .limit(1)

    if (!invite) {
      throw createError({ statusCode: 400, statusMessage: 'Invite không hợp lệ hoặc đã dùng' })
    }
    if (invite.expiresAt < now) {
      throw createError({ statusCode: 400, statusMessage: 'Invite đã hết hạn' })
    }

    email = invite.email
    isAdmin = false
    inviteIdToConsume = invite.id
  } else {
    // Nhánh B — first-user bootstrap
    // COUNT luôn trả 1 row, an toàn destructure. `!` để TS narrow khỏi undefined.
    const rows = await db
      .select({ count: sql<number>`count(*)` })
      .from(coreUsers)
    const count = rows[0]!.count

    if (count > 0) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Đăng ký cần invite. Liên hệ admin để nhận link.',
      })
    }

    if (!bodyEmail) {
      throw createError({ statusCode: 400, statusMessage: 'Cần email' })
    }
    email = bodyEmail
    isAdmin = true
  }

  // Duplicate email check — tránh crash unique constraint (edge case: invite gửi tới email đã đăng ký).
  const [existing] = await db
    .select({ id: coreUsers.id })
    .from(coreUsers)
    .where(eq(coreUsers.email, email))
    .limit(1)
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'Email đã được đăng ký' })
  }

  const passwordHash = await hashPassword(password)

  const [user] = await db
    .insert(coreUsers)
    .values({ email, passwordHash, isAdmin, createdAt: now, updatedAt: now })
    .returning()

  if (!user) {
    throw createError({ statusCode: 500, statusMessage: 'Không tạo được user' })
  }

  if (inviteIdToConsume !== null) {
    await db
      .update(coreInvites)
      .set({ usedAt: now })
      .where(eq(coreInvites.id, inviteIdToConsume))
  }

  const sessionUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    isAdmin: user.isAdmin,
  }

  await setUserSession(event, { user: sessionUser })

  return { ok: true, user: sessionUser }
})
