/**
 * Middleware toàn cục: chưa login → đá /login.
 *
 * Public routes (không cần auth): /login, /register, /forgot, /reset.
 * Admin-only: /admin/* — chặn nếu !isAdmin.
 * Chạy cả server (SSR) và client (SPA nav) — useUserSession() lo state ở cả 2 phía.
 */
const PUBLIC_ROUTES = ['/login', '/register', '/forgot', '/reset']

export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn, user } = useUserSession()

  const isPublic = PUBLIC_ROUTES.includes(to.path)

  if (isPublic) {
    // Đã login mà vào public auth page → về home.
    if (loggedIn.value) return navigateTo('/', { replace: true })
    return
  }

  if (!loggedIn.value) {
    return navigateTo('/login', { replace: true })
  }

  // Admin gate — bảo vệ luôn ở middleware để tránh flash UI trước khi server 403.
  if (to.path.startsWith('/admin') && !user.value?.isAdmin) {
    return navigateTo('/', { replace: true })
  }
})
