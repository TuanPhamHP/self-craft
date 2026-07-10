// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-07-01',
  devtools: { enabled: true },

  modules: [
    '@nuxt/ui',
    '@pinia/nuxt',
    'nuxt-auth-utils',
    '@vite-pwa/nuxt',
    'nitro-cloudflare-dev',
  ],

  css: ['~/assets/css/main.css'],

  // Runtime config — chỉ khai báo biến private (server-only) cho auth.
  // ENV mapping (Nuxt convention): NUXT_AUTH_USERNAME → runtimeConfig.auth.username, etc.
  // NUXT_SESSION_PASSWORD được nuxt-auth-utils đọc trực tiếp, không cần khai báo ở đây.
  runtimeConfig: {
    auth: {
      username: '',
      passwordHash: '',
    },
  },

  nitro: {
    preset: 'cloudflare-pages',
    experimental: { asyncContext: true },
    cloudflare: {
      deployConfig: true,
      nodeCompat: true,
    },
  },

  // PWA config tối thiểu — installable, cache shell/assets (P1).
  // Offline queue/sync để P3.
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Self Craft — Learning PWA',
      short_name: 'Self Craft',
      description: 'Personal learning PWA (English + Programming) with SRS.',
      theme_color: '#0f172a',
      background_color: '#0f172a',
      display: 'standalone',
      start_url: '/',
      icons: [],
    },
    workbox: {
      navigateFallback: '/',
    },
  },
})
