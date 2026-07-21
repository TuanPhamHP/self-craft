/**
 * GET /api/english/cards/due — danh sách card tới hạn của user hiện tại (module English).
 *
 * Query eng_user_vocab WHERE userId=? AND due <= now, JOIN eng_vocab lấy content.
 * Dùng index idx_eng_user_vocab_user_state_due (leading col user_id, state, due).
 * ORDER due asc → card quá hạn lâu nhất lên trước.
 */

import { and, asc, eq, lte } from 'drizzle-orm'
import { engUserVocab, engVocab } from '~~/server/database/schema'
import type { SrsState } from '#shared/utils/srs'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const userId = session.user.id

  const db = useDB()
  const now = Date.now()

  const rows = await db
    .select({
      vocabId: engUserVocab.vocabId,
      word: engVocab.word,
      meaning: engVocab.meaning,
      example: engVocab.example,
      ipa: engVocab.ipa,
      topic: engVocab.topic,
      band: engVocab.band,
      note: engUserVocab.note,
      due: engUserVocab.due,
      stability: engUserVocab.stability,
      difficulty: engUserVocab.difficulty,
      elapsedDays: engUserVocab.elapsedDays,
      scheduledDays: engUserVocab.scheduledDays,
      reps: engUserVocab.reps,
      lapses: engUserVocab.lapses,
      state: engUserVocab.state,
      lastReview: engUserVocab.lastReview,
    })
    .from(engUserVocab)
    .innerJoin(engVocab, eq(engUserVocab.vocabId, engVocab.id))
    .where(and(eq(engUserVocab.userId, userId), lte(engUserVocab.due, now)))
    .orderBy(asc(engUserVocab.due))

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
      vocabId: r.vocabId,
      word: r.word,
      meaning: r.meaning,
      example: r.example,
      ipa: r.ipa,
      topic: r.topic,
      band: r.band,
      note: r.note,
      srsState,
    }
  })
})
