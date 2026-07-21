/**
 * Zod schemas cho auth flow.
 * Dùng chung UI form + server handler → validate 1 nguồn.
 */

import { z } from 'zod'

const emailField = z.string().trim().toLowerCase().email('Email không hợp lệ')
const passwordField = z
  .string()
  .min(8, 'Password phải >= 8 ký tự')
  .max(128, 'Password quá dài')

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Cần nhập password'),
})
export type LoginInput = z.infer<typeof loginSchema>

/**
 * Register: có 2 nhánh
 * - `token` có → accept invite (email lấy từ invite, client không gửi email).
 * - `token` empty → first-user bootstrap (chỉ được khi DB users rỗng), phải gửi email.
 */
export const registerSchema = z
  .object({
    token: z.string().trim().optional(),
    email: emailField.optional(),
    password: passwordField,
  })
  .refine((v) => !!v.token || !!v.email, {
    message: 'Cần token hoặc email',
    path: ['email'],
  })
export type RegisterInput = z.infer<typeof registerSchema>

export const forgotSchema = z.object({
  email: emailField,
})
export type ForgotInput = z.infer<typeof forgotSchema>

export const resetSchema = z.object({
  token: z.string().trim().min(1, 'Thiếu token'),
  password: passwordField,
})
export type ResetInput = z.infer<typeof resetSchema>

export const inviteCreateSchema = z.object({
  email: emailField,
})
export type InviteCreateInput = z.infer<typeof inviteCreateSchema>

/** Update display name — dùng cho modal AskName + settings. */
export const nameUpdateSchema = z.object({
  name: z.string().trim().min(1, 'Cần tên').max(50, 'Tên tối đa 50 ký tự'),
})
export type NameUpdateInput = z.infer<typeof nameUpdateSchema>

export const tokenParamSchema = z
  .string()
  .trim()
  .min(16, 'Token không hợp lệ')
  .max(128, 'Token không hợp lệ')
