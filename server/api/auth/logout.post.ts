/**
 * POST /api/auth/logout — clear session cookie.
 */
export default defineEventHandler(async (event) => {
  await clearUserSession(event)
  return { ok: true }
})
