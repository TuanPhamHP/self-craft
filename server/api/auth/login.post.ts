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
  const cfg = useRuntimeConfig(event)

  // TEMP DEBUG — chẩn đoán runtimeConfig binding trên CF Pages, xóa sau khi fix.
  // KHÔNG log giá trị thật của hash/password, chỉ log SET/EMPTY.
  console.log('[auth-debug] username:', cfg.auth?.username ? 'SET' : 'EMPTY')
  console.log('[auth-debug] passwordHash:', cfg.auth?.passwordHash ? 'SET' : 'EMPTY')
  const cfEnv = event.context.cloudflare?.env
  console.log('[auth-debug] cf NUXT_AUTH_USERNAME:', cfEnv?.NUXT_AUTH_USERNAME ? 'SET' : 'EMPTY')
  console.log('[auth-debug] cf NUXT_AUTH_PASSWORD_HASH:', cfEnv?.NUXT_AUTH_PASSWORD_HASH ? 'SET' : 'EMPTY')

  // Fail-safe: nếu env chưa set, KHÔNG cho login (tránh treat empty match như hợp lệ).
  if (!cfg.auth.username || !cfg.auth.passwordHash) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Auth env chưa cấu hình (NUXT_AUTH_USERNAME / NUXT_AUTH_PASSWORD_HASH)',
    })
  }

  // So username trước — cheap; nếu mismatch, vẫn phải kèm password check với thời gian
  // tương đương để tránh side-channel (nhưng single-user, 1 IP, không critical → skip).
  const userOk = username === cfg.auth.username
  const passOk = userOk ? await verifyPassword(cfg.auth.passwordHash, password) : false

  if (!userOk || !passOk) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Sai username hoặc password',
    })
  }

  await setUserSession(event, {
    user: { name: cfg.auth.username },
  })

  return { ok: true, user: { name: cfg.auth.username } }
})
