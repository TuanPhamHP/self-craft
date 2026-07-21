/**
 * requireAdmin — chặn route admin-only. Wrapping requireUserSession + check isAdmin.
 * Trả về user session (đã narrow) để caller dùng luôn.
 */
export async function requireAdmin(event: Parameters<typeof requireUserSession>[0]) {
  const session = await requireUserSession(event)
  if (!session.user.isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Cần quyền admin' })
  }
  return session
}
