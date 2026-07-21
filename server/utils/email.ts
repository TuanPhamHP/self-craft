/**
 * Email util — gửi transactional email qua Resend REST API.
 *
 * Dùng fetch trực tiếp (không SDK) để tránh dep + nhẹ bundle Workers.
 * Runtime config lấy từ env NUXT_RESEND_API_KEY / NUXT_RESEND_FROM_EMAIL / NUXT_APP_URL.
 *
 * DEV fallback: khi RESEND_API_KEY EMPTY → log link ra console thay vì gửi thật.
 * Cho phép test invite/reset local mà không cần Resend account.
 */

interface SendEmailArgs {
  to: string
  subject: string
  html: string
  text: string
}

interface ResendErrorResponse {
  name?: string
  message?: string
  statusCode?: number
}

/**
 * Gửi email qua Resend. Trả về id message hoặc null nếu ở dev-mode (chưa cấu hình).
 * Throw createError nếu API call fail — caller quyết định có blocker flow không.
 */
export async function sendEmail(args: SendEmailArgs): Promise<string | null> {
  const cfg = useRuntimeConfig()
  const apiKey = cfg.resendApiKey
  const from = cfg.resendFromEmail

  if (!apiKey || !from) {
    // Dev fallback: in ra console. KHÔNG throw — caller vẫn tiếp tục flow.
    console.warn('[email] RESEND chưa cấu hình → dev fallback log:')
    console.warn(`  To:      ${args.to}`)
    console.warn(`  Subject: ${args.subject}`)
    console.warn(`  Text:\n${args.text}`)
    return null
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
    }),
  })

  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as ResendErrorResponse | null
    console.error('[email] Resend fail:', res.status, err)
    throw createError({
      statusCode: 502,
      statusMessage: `Gửi email thất bại: ${err?.message ?? res.statusText}`,
    })
  }

  const data = (await res.json()) as { id?: string }
  return data.id ?? null
}

/** Base URL app dùng để build link trong email. */
export function appUrl(): string {
  const cfg = useRuntimeConfig()
  const url = cfg.appUrl
  if (!url) {
    // Fallback dev: log & trả localhost. Production nên set NUXT_APP_URL.
    console.warn('[email] NUXT_APP_URL chưa set — dùng http://localhost:3000')
    return 'http://localhost:3000'
  }
  return url.replace(/\/+$/, '')
}
