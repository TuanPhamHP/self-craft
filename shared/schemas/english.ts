/**
 * Zod schemas cho module English — dùng chung client + server.
 *
 * Convention: server route validate qua các schema này để giữ format lỗi
 * (createError { statusCode: 400, statusMessage, data }) đồng nhất.
 * Client (khi có UI) có thể reuse cho form.
 */

import { z } from 'zod'

/** CEFR band chuẩn — enum cố định, đổi phải cân nhắc (data cũ có thể dùng giá trị cũ). */
export const CEFR_BANDS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const
export const cefrBandSchema = z.enum(CEFR_BANDS)
export type CefrBand = z.infer<typeof cefrBandSchema>

/** Body cho POST /api/english/vocab */
export const vocabCreateSchema = z.object({
  word: z.string().trim().min(1, 'Cần điền từ'),
  meaning: z.string().trim().min(1, 'Cần điền nghĩa (tiếng Việt)'),
  example: z.string().trim().min(1, 'Cần câu ví dụ'),
  ipa: z.string().trim().min(1).optional(),
  topic: z.string().trim().min(1).max(60, 'Chuyên ngành tối đa 60 ký tự').optional(),
  band: cefrBandSchema.optional(),
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

/**
 * Param cho :id — số nguyên dương. Sau restructure shared-pool, `:id` là `eng_vocab.id`
 * (không còn `core_cards.id`); combo (userId, vocabId) là PK của eng_user_vocab.
 */
export const vocabIdParamSchema = z.coerce.number().int().positive()

/**
 * Body cho POST /api/english/cards/enroll — bulk enroll từ pool hệ thống vào queue user.
 *
 * `count` preset Anki-style (5/10/20) để tránh nhập bừa; server clamp thêm.
 * `band`/`topic` optional → không set = random trong dimension đó.
 * Response `enrolled` có thể < `count` nếu pool cạn với filter.
 */
export const vocabEnrollCounts = [5, 10, 20] as const
export type VocabEnrollCount = (typeof vocabEnrollCounts)[number]

export const vocabEnrollSchema = z.object({
  count: z.union([z.literal(5), z.literal(10), z.literal(20)]),
  band: cefrBandSchema.optional(),
  topic: z.string().trim().min(1).max(60).optional(),
})

export type VocabEnrollInput = z.infer<typeof vocabEnrollSchema>
