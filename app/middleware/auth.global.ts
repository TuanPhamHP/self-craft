/**
 * Middleware toàn cục: chưa login → đá /login.
 *
 * `/login` phải KHÔNG chặn để tránh redirect loop.
 * Chạy cả server (SSR) và client (SPA nav) — useUserSession() lo state ở cả 2 phía.
 */
export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useUserSession()

  if (to.path === '/login') {
    // Đã login mà vào /login → về review.
    if (loggedIn.value) return navigateTo('/english/review', { replace: true })
    return
  }

  if (!loggedIn.value) {
    return navigateTo('/login', { replace: true })
  }
})
