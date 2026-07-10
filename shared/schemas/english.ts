/**
 * Zod schemas cho module English — dùng chung client + server.
 *
 * Convention: server route validate qua các schema này để giữ format lỗi
 * (createError { statusCode: 400, statusMessage, data }) đồng nhất.
 * Client (khi có UI) có thể reuse cho form.
 */

import { z } from 'zod'

/** Body cho POST /api/english/vocab */
export const vocabCreateSchema = z.object({
  word: z.string().trim().min(1, 'Cần điền từ'),
  meaning: z.string().trim().min(1, 'Cần điền nghĩa (tiếng Việt)'),
  example: z.string().trim().min(1, 'Cần câu ví dụ'),
  ipa: z.string().trim().min(1).optional(),
})

export type VocabCreateInput = z.infer<typeof vocabCreateSchema>

/**
 * Body cho POST /api/english/cards/:id/review.
 * Grade: 1 Again | 2 Hard | 3 Good | 4 Easy (đồng bộ Grade trong shared/utils/srs.ts).
 * Dùng union of literals thay vì number().min(1).max(4) để narrow về `1|2|3|4` cho TS.
 */
export const cardReviewSchema = z.object({
  grade: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
})

export type CardReviewInput = z.infer<typeof cardReviewSchema>

/** Param cho :id — số nguyên dương (path param luôn là string, cần parse). */
export const cardIdParamSchema = z.coerce.number().int().positive()
