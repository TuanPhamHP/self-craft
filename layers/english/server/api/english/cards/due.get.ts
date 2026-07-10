/**
 * GET /api/english/cards/due — danh sách card tới hạn của module English.
 *
 * Query core_cards WHERE module='english' AND due <= now, join eng_vocab lấy content.
 * Order theo due asc để card quá hạn lâu nhất lên trước.
 * Dùng index idx_core_cards_module_due (đã có trong schema).
 */

import { and, asc, eq, lte } from 'drizzle-orm'
import { coreCards, engVocab } from '~~/server/database/schema'
import type { SrsState } from '#shared/utils/srs'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const db = useDB()
  const now = Date.now()

  const rows = await db
    .select({
      cardId: coreCards.id,
      word: engVocab.word,
      meaning: engVocab.meaning,
      example: engVocab.example,
      ipa: engVocab.ipa,
      due: coreCards.due,
      stability: coreCards.stability,
      difficulty: coreCards.difficulty,
      elapsedDays: coreCards.elapsedDays,
      scheduledDays: coreCards.scheduledDays,
      reps: coreCards.reps,
      lapses: coreCards.lapses,
      state: coreCards.state,
      lastReview: coreCards.lastReview,
    })
    .from(coreCards)
    .innerJoin(engVocab, eq(coreCards.itemId, engVocab.id))
    .where(and(eq(coreCards.module, 'english'), lte(coreCards.due, now)))
    .orderBy(asc(coreCards.due))

  return rows.map((r) => {
    const srsState: SrsState = {
      due: r.due,
      stability: r.stability,
      difficulty: r.difficulty,
      elapsedDays: r.elapsedDays,
      scheduledDays: r.scheduledDays,
      reps: r.reps,
      lapses: r.lapses,
      state: r.state,
      lastReview: r.lastReview,
    }
    return {
      cardId: r.cardId,
      word: r.word,
      meaning: r.meaning,
      example: r.example,
      ipa: r.ipa,
      srsState,
    }
  })
})
