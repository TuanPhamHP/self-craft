/**
 * POST /api/english/vocab — thêm 1 từ vào queue học của user hiện tại.
 *
 * Sau restructure shared-pool:
 *  - eng_vocab là content pool (created_by NULL = hệ thống, có value = private).
 *  - eng_user_vocab giữ SRS state + note per (user, vocab).
 *
 * Business flow:
 *  1. Tìm từ hệ thống có sẵn (created_by IS NULL AND word = X).
 *  2. Nếu có:
 *     - Reuse vocab_id (không nhân bản content).
 *     - `note` = form.meaning nếu KHÁC system.meaning; trùng → NULL.
 *     - Insert eng_user_vocab. Nếu user đã học từ này rồi → 409.
 *  3. Nếu không có:
 *     - Tạo eng_vocab mới (created_by = userId).
 *     - Insert eng_user_vocab với srsNew().
 *     - Nếu user đã có từ private trùng → unique constraint bắt lỗi → 409.
 *
 * D1 không có transaction cho drizzle: 2 insert sequential. Rủi ro
 * để lại vocab mồ côi khi crash giữa 2 lệnh là chấp nhận được ở scope cá nhân.
 */

import { and, eq, isNull } from 'drizzle-orm'
import { engVocab, engUserVocab } from '~~/server/database/schema'
import { srsNew } from '#shared/utils/srs'
import { vocabCreateSchema } from '#shared/schemas/english'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const userId = session.user.id

  const parsed = await readValidatedBody(event, (body) => vocabCreateSchema.safeParse(body))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid vocab payload',
      data: parsed.error.issues,
    })
  }
  const input = parsed.data

  const db = useDB()
  const now = Date.now()

  // Bước 1: tìm từ hệ thống có sẵn.
  const [systemVocab] = await db
    .select({ id: engVocab.id, meaning: engVocab.meaning })
    .from(engVocab)
    .where(and(eq(engVocab.word, input.word), isNull(engVocab.createdBy)))
    .limit(1)

  const srs = srsNew(now)

  if (systemVocab) {
    // Reuse: check user đã học chưa.
    const [existing] = await db
      .select({ userId: engUserVocab.userId })
      .from(engUserVocab)
      .where(and(eq(engUserVocab.userId, userId), eq(engUserVocab.vocabId, systemVocab.id)))
      .limit(1)

    if (existing) {
      throw createError({
        statusCode: 409,
        statusMessage: `Bạn đã có từ "${input.word}" trong queue học rồi`,
      })
    }

    const note = input.meaning === systemVocab.meaning ? null : input.meaning

    const [userVocabRow] = await db
      .insert(engUserVocab)
      .values({
        userId,
        vocabId: systemVocab.id,
        due: srs.due,
        stability: srs.stability,
        difficulty: srs.difficulty,
        elapsedDays: srs.elapsedDays,
        scheduledDays: srs.scheduledDays,
        reps: srs.reps,
        lapses: srs.lapses,
        state: srs.state,
        lastReview: srs.lastReview,
        note,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    if (!userVocabRow) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to insert eng_user_vocab (no row returned)',
      })
    }

    return {
      reused: true,
      vocab: { id: systemVocab.id, word: input.word, meaning: systemVocab.meaning },
      userVocab: userVocabRow,
    }
  }

  // Bước 2: tạo eng_vocab private (created_by = userId).
  // Partial unique index (created_by, word) WHERE created_by IS NOT NULL sẽ bắt duplicate.
  let vocabRow
  try {
    ;[vocabRow] = await db
      .insert(engVocab)
      .values({
        word: input.word,
        meaning: input.meaning,
        example: input.example,
        ipa: input.ipa ?? null,
        topic: input.topic ?? null,
        band: input.band ?? null,
        pos: null,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
  } catch (e) {
    // D1 trả lỗi UNIQUE constraint dạng "UNIQUE constraint failed: ..."
    const msg = e instanceof Error ? e.message : String(e)
    if (/UNIQUE constraint failed/i.test(msg)) {
      throw createError({
        statusCode: 409,
        statusMessage: `Bạn đã có từ "${input.word}" trong queue học rồi`,
      })
    }
    throw e
  }

  if (!vocabRow) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to insert eng_vocab (no row returned)',
    })
  }

  const [userVocabRow] = await db
    .insert(engUserVocab)
    .values({
      userId,
      vocabId: vocabRow.id,
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
    })
    .returning()

  if (!userVocabRow) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to insert eng_user_vocab (no row returned)',
    })
  }

  return {
    reused: false,
    vocab: vocabRow,
    userVocab: userVocabRow,
  }
})
