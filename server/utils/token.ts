/**
 * Token util cho invite + password reset.
 *
 * Raw token (URL-safe, 32-byte entropy) → gửi trong link email cho user.
 * Hash SHA-256 → lưu DB.
 *
 * Nếu DB leak, kẻ tấn công không dùng token thẳng được (phải brute-force pre-image SHA-256,
 * không khả thi với 256-bit random). Đây là practice cùng dạng với "hash password reset token".
 *
 * Dùng Web Crypto → Workers-compatible, không cần node:crypto.
 */

const TOKEN_BYTES = 32

/** Sinh raw token URL-safe (base64url, ~43 ký tự). */
export function generateToken(): string {
  const buf = new Uint8Array(TOKEN_BYTES)
  crypto.getRandomValues(buf)
  // base64url = base64 + thay ký tự URL-unsafe
  const b64 = btoa(String.fromCharCode(...buf))
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Hash SHA-256 hex — dùng để lưu DB và lookup. */
export async function hashToken(token: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
