/**
 * Zod schemas cho auth flow.
 * Dùng chung UI form + server login handler → validate 1 nguồn.
 */

import { z } from 'zod'

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Cần nhập username'),
  password: z.string().min(1, 'Cần nhập password'),
})

export type LoginInput = z.infer<typeof loginSchema>
