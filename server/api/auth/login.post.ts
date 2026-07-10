/**
 * POST /api/auth/login — đăng nhập single-user.
 *
 * Verify username khớp env + password khớp scrypt hash từ env.
 * Thành công → setUserSession → cookie sealed; client dùng useUserSession().
 */

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

  const { username, password } = parsed.data
  const cfg = useRuntimeConfig(event).auth

  // Fail-safe: nếu env chưa set, KHÔNG cho login (tránh treat empty match như hợp lệ).
  if (!cfg.username || !cfg.passwordHash) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Auth env chưa cấu hình (NUXT_AUTH_USERNAME / NUXT_AUTH_PASSWORD_HASH)',
    })
  }

  // So username trước — cheap; nếu mismatch, vẫn phải kèm password check với thời gian
  // tương đương để tránh side-channel (nhưng single-user, 1 IP, không critical → skip).
  const userOk = username === cfg.username
  const passOk = userOk ? await verifyPassword(cfg.passwordHash, password) : false

  if (!userOk || !passOk) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Sai username hoặc password',
    })
  }

  await setUserSession(event, {
    user: { name: cfg.username },
  })

  return { ok: true, user: { name: cfg.username } }
})
