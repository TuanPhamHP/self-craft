/**
 * POST /api/admin/invites — gửi invite cho 1 email.
 *
 * Flow:
 *  1. Reject nếu email đã có user.
 *  2. Sinh raw token → hash → insert invite (TTL 7 ngày).
 *  3. Gửi email link /register?token=<raw>. Nếu Resend fail → invite vẫn được tạo (admin có thể copy link từ log).
 */

import { eq } from 'drizzle-orm'
import { coreInvites, coreUsers } from '~~/server/database/schema'
import { inviteCreateSchema } from '#shared/schemas/auth'

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 ngày

export default defineEventHandler(async (event) => {
  const session = await requireAdmin(event)

  const parsed = await readValidatedBody(event, (body) => inviteCreateSchema.safeParse(body))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid invite payload',
      data: parsed.error.issues,
    })
  }

  const { email } = parsed.data
  const db = useDB()
  const now = Date.now()

  const [existing] = await db
    .select({ id: coreUsers.id })
    .from(coreUsers)
    .where(eq(coreUsers.email, email))
    .limit(1)

  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'Email đã có tài khoản' })
  }

  const rawToken = generateToken()
  const tokenHash = await hashToken(rawToken)

  const [invite] = await db
    .insert(coreInvites)
    .values({
      email,
      tokenHash,
      invitedBy: session.user.id,
      expiresAt: now + INVITE_TTL_MS,
      createdAt: now,
    })
    .returning()

  if (!invite) {
    throw createError({ statusCode: 500, statusMessage: 'Không tạo được invite' })
  }

  const link = `${appUrl()}/register?token=${rawToken}`
  await sendEmail({
    to: email,
    subject: '[Self Craft] Bạn được mời tham gia',
    text: `${session.user.email} đã mời bạn tham gia Self Craft.\n\nNhấn link dưới để tạo tài khoản (hiệu lực 7 ngày):\n\n${link}`,
    html: `<p><b>${session.user.email}</b> đã mời bạn tham gia Self Craft.</p><p>Nhấn link dưới để tạo tài khoản (hiệu lực 7 ngày):</p><p><a href="${link}">${link}</a></p>`,
  })

  return {
    ok: true,
    invite: {
      id: invite.id,
      email: invite.email,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
    },
  }
})
