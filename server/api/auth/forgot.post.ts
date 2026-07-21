/**
 * POST /api/auth/forgot — kích hoạt reset password.
 *
 * Anti-enumeration: LUÔN trả 200 { ok: true } dù email có tồn tại hay không.
 * Nếu tồn tại → tạo token, gửi email link /reset?token=…
 * Token expire 1 giờ. Không invalidate token cũ (nếu user click nhiều lần thì cái cũ vẫn valid tới khi expire).
 */

import { eq } from 'drizzle-orm'
import { corePasswordResets, coreUsers } from '~~/server/database/schema'
import { forgotSchema } from '#shared/schemas/auth'

const RESET_TTL_MS = 60 * 60 * 1000 // 1 giờ

export default defineEventHandler(async (event) => {
  const parsed = await readValidatedBody(event, (body) => forgotSchema.safeParse(body))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid forgot payload',
      data: parsed.error.issues,
    })
  }

  const { email } = parsed.data
  const db = useDB()
  const now = Date.now()

  const [user] = await db
    .select({ id: coreUsers.id, email: coreUsers.email })
    .from(coreUsers)
    .where(eq(coreUsers.email, email))
    .limit(1)

  if (user) {
    const rawToken = generateToken()
    const tokenHash = await hashToken(rawToken)
    await db.insert(corePasswordResets).values({
      userId: user.id,
      tokenHash,
      expiresAt: now + RESET_TTL_MS,
      createdAt: now,
    })

    const link = `${appUrl()}/reset?token=${rawToken}`
    await sendEmail({
      to: user.email,
      subject: '[Self Craft] Đặt lại mật khẩu',
      text: `Nhấn link dưới đây để đặt lại mật khẩu (hiệu lực 1 giờ):\n\n${link}\n\nNếu bạn không yêu cầu, có thể bỏ qua email này.`,
      html: `<p>Nhấn link dưới đây để đặt lại mật khẩu (hiệu lực 1 giờ):</p><p><a href="${link}">${link}</a></p><p>Nếu bạn không yêu cầu, có thể bỏ qua email này.</p>`,
    })
  }

  return { ok: true }
})
