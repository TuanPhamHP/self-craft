/**
 * POST /api/english/cards/:id/review — chấm điểm 1 card.
 *
 * Flow:
 *  1. Validate id (path) + grade (body) qua Zod.
 *  2. Load core_cards theo id (module='english') → tái tạo SrsState.
 *  3. Gọi srsReview(state, grade, now) qua wrapper shared/utils/srs.
 *  4. UPDATE core_cards với state mới + updatedAt.
 *  5. INSERT core_review_logs (snapshot before/after) cho audit trail.
 *  6. Trả về srsState mới + due kế tiếp.
 */

import { and, eq } from 'drizzle-orm'
import { coreCards, coreReviewLogs } from '~~/server/database/schema'
import { srsReview, type Grade, type SrsState } from '#shared/utils/srs'
import { cardIdParamSchema, cardReviewSchema } from '#shared/schemas/english'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  // Path param
  const idRaw = getRouterParam(event, 'id')
  const idParsed = cardIdParamSchema.safeParse(idRaw)
  if (!idParsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid card id',
      data: idParsed.error.issues,
    })
  }
  const cardId = idParsed.data

  // Body
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

  // Load card — chặn cross-module bằng cách filter module='english'.
  const [row] = await db
    .select()
    .from(coreCards)
    .where(and(eq(coreCards.id, cardId), eq(coreCards.module, 'english')))
    .limit(1)

  if (!row) {
    throw createError({
      statusCode: 404,
      statusMessage: `English card ${cardId} not found`,
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

  // Persist state mới trên core_cards.
  await db
    .update(coreCards)
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
    .where(eq(coreCards.id, cardId))

  // Audit trail — snapshot before/after để replay/rollback nếu đổi engine.
  await db.insert(coreReviewLogs).values({
    cardId,
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
    cardId,
    srsState: stateAfter,
    due: stateAfter.due,
  }
})
