// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	compatibilityDate: '2026-07-01',
	devtools: { enabled: true },
	app: {
		baseURL: '/',
		head: {
			titleTemplate: 'Self Craft - %s',
			title: 'Tự học',
			link: [
				{
					rel: 'preconnect',
					href: 'https://fonts.googleapis.com',
				},
				{
					rel: 'preconnect',
					href: 'https://fonts.gstatic.com',
					crossorigin: '',
				},
				{
					rel: 'stylesheet',
					href: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap',
				},
			],
		},
	},
	modules: ['@nuxt/ui', '@pinia/nuxt', 'nuxt-auth-utils', '@vite-pwa/nuxt', 'nitro-cloudflare-dev'],

	css: ['~/assets/css/main.css'],

	// Runtime config — biến private (server-only).
	// ENV mapping (Nuxt convention): NUXT_RESEND_API_KEY → runtimeConfig.resendApiKey, etc.
	// NUXT_SESSION_PASSWORD được nuxt-auth-utils đọc trực tiếp, không cần khai báo ở đây.
	runtimeConfig: {
		resendApiKey: '', // NUXT_RESEND_API_KEY — API key Resend (empty ở dev → fallback log console)
		resendFromEmail: '', // NUXT_RESEND_FROM_EMAIL — địa chỉ From đã verify DNS với Resend
		appUrl: '', // NUXT_APP_URL — base URL app (dùng build link invite/reset trong email)
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
});
