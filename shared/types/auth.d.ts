/**
 * Module augmentation cho nuxt-auth-utils.
 * Session shape dùng khắp `useUserSession()` (client) + `requireUserSession(event)` (server).
 * Đặt trong shared/types/ để cả tsconfig client + server đều pick up (glob shared d.ts).
 * Đổi field ở đây → phải update setUserSession call site + UI đọc user.
 */
declare module '#auth-utils' {
  interface User {
    id: number
    email: string
    name: string | null
    isAdmin: boolean
  }

  interface UserSession {
    user: User
  }

  interface SecureSessionData {
    // Reserved: chỉ đọc được ở server (không gửi về client). Chưa dùng.
  }
}

export {}
