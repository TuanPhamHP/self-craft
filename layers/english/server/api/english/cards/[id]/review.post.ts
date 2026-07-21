/**
 * POST /api/english/cards/:id/review — chấm điểm 1 vocab (user hiện tại).
 *
 * :id ở đây là `vocab_id` (không phải core_cards.id — sau restructure shared-pool).
 * Combo (userId, vocabId) là PK của eng_user_vocab.
 *
 * Flow:
 *  1. Validate id (path) + grade (body) qua Zod.
 *  2. Load eng_user_vocab WHERE (userId, vocabId) → tái tạo SrsState.
 *  3. Gọi srsReview(state, grade, now) qua wrapper shared/utils/srs.
 *  4. UPDATE eng_user_vocab với state mới.
 *  5. INSERT core_review_logs (module='english', itemId=vocabId, snapshot before/after) cho audit trail.
 *  6. Trả về srsState mới + due kế tiếp.
 */

import { and, eq } from 'drizzle-orm'
import { coreReviewLogs, engUserVocab } from '~~/server/database/schema'
import { srsReview, type Grade, type SrsState } from '#shared/utils/srs'
import { cardReviewSchema, vocabIdParamSchema } from '#shared/schemas/english'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const userId = session.user.id

  const idRaw = getRouterParam(event, 'id')
  const idParsed = vocabIdParamSchema.safeParse(idRaw)
  if (!idParsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid vocab id',
      data: idParsed.error.issues,
    })
  }
  const vocabId = idParsed.data

  const bodyParsed = await readValidatedBody(event, (body) => cardReviewSchema.safeParse(body))
  if (!bodyParsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid review payload',
      data: bodyParsed.error.issues,
    })
  }
  const grade: Grade = bodyParsed.data.grade

  const db = useDB()
  const now = Date.now()

  const [row] = await db
    .select()
    .from(engUserVocab)
    .where(and(eq(engUserVocab.userId, userId), eq(engUserVocab.vocabId, vocabId)))
    .limit(1)

  if (!row) {
    throw createError({
      statusCode: 404,
      statusMessage: `English vocab ${vocabId} not in your queue`,
    })
  }

  const stateBefore: SrsState = {
    due: row.due,
    stability: row.stability,
    difficulty: row.difficulty,
    elapsedDays: row.elapsedDays,
    scheduledDays: row.scheduledDays,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state,
    lastReview: row.lastReview,
  }

  const stateAfter = srsReview(stateBefore, grade, now)

  await db
    .update(engUserVocab)
    .set({
      due: stateAfter.due,
      stability: stateAfter.stability,
      difficulty: stateAfter.difficulty,
      elapsedDays: stateAfter.elapsedDays,
      scheduledDays: stateAfter.scheduledDays,
      reps: stateAfter.reps,
      lapses: stateAfter.lapses,
      state: stateAfter.state,
      lastReview: stateAfter.lastReview,
      updatedAt: now,
    })
    .where(and(eq(engUserVocab.userId, userId), eq(engUserVocab.vocabId, vocabId)))

  await db.insert(coreReviewLogs).values({
    userId,
    module: 'english',
    itemId: vocabId,
    grade,
    stateBefore: stateBefore.state,
    stabilityBefore: stateBefore.stability,
    difficultyBefore: stateBefore.difficulty,
    stateAfter: stateAfter.state,
    stabilityAfter: stateAfter.stability,
    difficultyAfter: stateAfter.difficulty,
    scheduledDaysAfter: stateAfter.scheduledDays,
    dueAfter: stateAfter.due,
    reviewedAt: now,
  })

  return {
    vocabId,
    srsState: stateAfter,
    due: stateAfter.due,
  }
})
