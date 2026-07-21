/**
 * POST /api/english/cards/enroll — bulk enroll N từ pool hệ thống vào queue user.
 *
 * Dùng ở empty state màn review khi user hết card tới hạn nhưng muốn học thêm.
 * Chỉ pick từ pool hệ thống (created_by IS NULL) và loại trừ vocab user đã enroll.
 *
 * Query:
 *  - LEFT JOIN eng_user_vocab với (userId hiện tại) → filter uv.vocabId IS NULL
 *    = "user chưa học từ này".
 *  - Optional filter band/topic; không set = random trong dimension đó.
 *  - ORDER BY RANDOM() LIMIT count (D1 dataset nhỏ, RANDOM() chi phí OK).
 *
 * Bulk insert eng_user_vocab với srsNew() — mọi vocab enroll đều state=New, due=now
 * → xuất hiện ngay ở /api/english/cards/due lần fetch kế tiếp.
 *
 * Response.enrolled có thể < input.count nếu pool cạn với filter đã chọn.
 * Trả về danh sách vocabId đã enroll để client tuỳ dùng (vd analytics/toast chi tiết).
 */

import { and, eq, isNull, sql } from 'drizzle-orm'
import { engUserVocab, engVocab } from '~~/server/database/schema'
import { srsNew } from '#shared/utils/srs'
import { vocabEnrollSchema } from '#shared/schemas/english'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const userId = session.user.id

  const parsed = await readValidatedBody(event, (body) => vocabEnrollSchema.safeParse(body))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid enroll payload',
      data: parsed.error.issues,
    })
  }
  const input = parsed.data

  const db = useDB()

  const conditions = [
    isNull(engVocab.createdBy),
    isNull(engUserVocab.vocabId), // user chưa enroll
  ]
  if (input.band) conditions.push(eq(engVocab.band, input.band))
  if (input.topic) conditions.push(eq(engVocab.topic, input.topic))

  const candidates = await db
    .select({ id: engVocab.id })
    .from(engVocab)
    .leftJoin(
      engUserVocab,
      and(eq(engUserVocab.vocabId, engVocab.id), eq(engUserVocab.userId, userId)),
    )
    .where(and(...conditions))
    .orderBy(sql`RANDOM()`)
    .limit(input.count)

  if (candidates.length === 0) {
    return { enrolled: 0, vocabIds: [] as number[] }
  }

  const now = Date.now()
  const srs = srsNew(now)

  const values = candidates.map((c) => ({
    userId,
    vocabId: c.id,
    due: srs.due,
    stability: srs.stability,
    difficulty: srs.difficulty,
    elapsedDays: srs.elapsedDays,
    scheduledDays: srs.scheduledDays,
    reps: srs.reps,
    lapses: srs.lapses,
    state: srs.state,
    lastReview: srs.lastReview,
    note: null,
    createdAt: now,
    updatedAt: now,
  }))

  await db.insert(engUserVocab).values(values)

  return {
    enrolled: values.length,
    vocabIds: candidates.map((c) => c.id),
  }
})
