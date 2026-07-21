/**
 * POST /api/auth/login — đăng nhập.
 *
 * Query core_users theo email, verify password scrypt. Thành công → setUserSession.
 * Cookie sealed do nuxt-auth-utils quản (env NUXT_SESSION_PASSWORD ≥ 32 ký tự).
 */

import { eq } from 'drizzle-orm'
import { coreUsers } from '~~/server/database/schema'
import { loginSchema } from '#shared/schemas/auth'

export default defineEventHandler(async (event) => {
  const parsed = await readValidatedBody(event, (body) => loginSchema.safeParse(body))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid login payload',
      data: parsed.error.issues,
    })
  }

  const { email, password } = parsed.data
  const db = useDB()

  const [user] = await db
    .select()
    .from(coreUsers)
    .where(eq(coreUsers.email, email))
    .limit(1)

  // Generic message — không leak "email không tồn tại" (chống enumeration).
  const invalid = createError({ statusCode: 401, statusMessage: 'Sai email hoặc password' })

  if (!user) throw invalid
  const passOk = await verifyPassword(user.passwordHash, password)
  if (!passOk) throw invalid

  const sessionUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    isAdmin: user.isAdmin,
  }

  await setUserSession(event, { user: sessionUser })

  return { ok: true, user: sessionUser }
})
