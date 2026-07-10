// Augment nuxt-auth-utils' User interface với field session cần cho single-user app.
// Đặt ở shared/types/ vì cả app tsconfig lẫn server tsconfig đều include glob
// "shared/*.d.ts" recursive (theo Nuxt generated tsconfig).

declare module '#auth-utils' {
  interface User {
    name: string
  }
}

export {}
