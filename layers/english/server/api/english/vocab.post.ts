/**
 * POST /api/english/vocab — thêm 1 từ vựng mới.
 *
 * Business:
 * - Insert row vào `eng_vocab` (content).
 * - Sinh kèm 1 row `core_cards` (SRS state) với module='english' + itemId=vocabId + srsNew().
 *   Card LUÔN sinh cùng vocab → mọi từ đều có state SRS ngay từ đầu (state=New).
 *
 * D1 không có transaction thật cho drizzle; 2 insert phải sequential
 * (core_cards cần id từ eng_vocab). Với scope cá nhân 1 user, rủi ro
 * để lại vocab mồ côi khi crash giữa 2 lệnh là chấp nhận được.
 */

import { engVocab, coreCards } from '~~/server/database/schema'
import { srsNew } from '#shared/utils/srs'
import { vocabCreateSchema } from '#shared/schemas/english'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  // Validate body
  const parsed = await readValidatedBody(event, (body) => vocabCreateSchema.safeParse(body))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid vocab payload',
      data: parsed.error.issues,
    })
  }

  const db = useDB()
  const now = Date.now()

  // Insert eng_vocab, dùng returning() để lấy id (D1 hỗ trợ RETURNING).
  const [vocabRow] = await db
    .insert(engVocab)
    .values({
      word: parsed.data.word,
      meaning: parsed.data.meaning,
      example: parsed.data.example ?? null,
      ipa: parsed.data.ipa ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning()

  if (!vocabRow) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to insert eng_vocab (no row returned)',
    })
  }

  // Tạo SRS state ban đầu qua wrapper — KHÔNG import ts-fsrs trực tiếp.
  const srsState = srsNew(now)

  const [cardRow] = await db
    .insert(coreCards)
    .values({
      module: 'english',
      itemId: vocabRow.id,
      due: srsState.due,
      stability: srsState.stability,
      difficulty: srsState.difficulty,
      elapsedDays: srsState.elapsedDays,
      scheduledDays: srsState.scheduledDays,
      reps: srsState.reps,
      lapses: srsState.lapses,
      state: srsState.state,
      lastReview: srsState.lastReview,
      createdAt: now,
      updatedAt: now,
    })
    .returning()

  if (!cardRow) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to insert core_cards (no row returned)',
    })
  }

  return {
    vocab: vocabRow,
    card: {
      cardId: cardRow.id,
      srsState,
    },
  }
})
