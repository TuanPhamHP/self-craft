/**
 * POST /api/auth/name — update display name của user hiện tại.
 * Dùng cho modal AskName (lần đầu) + trang settings (sau này).
 * Update cả DB + session để UI reflect ngay không cần re-login.
 */

import { eq } from 'drizzle-orm'
import { coreUsers } from '~~/server/database/schema'
import { nameUpdateSchema } from '#shared/schemas/auth'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)

  const parsed = await readValidatedBody(event, (body) => nameUpdateSchema.safeParse(body))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid name payload',
      data: parsed.error.issues,
    })
  }

  const { name } = parsed.data
  const db = useDB()
  const now = Date.now()

  await db
    .update(coreUsers)
    .set({ name, updatedAt: now })
    .where(eq(coreUsers.id, session.user.id))

  // Merge vào session (setUserSession dùng defu, giữ nguyên các field khác).
  await setUserSession(event, {
    user: { ...session.user, name },
  })

  return { ok: true, name }
})
