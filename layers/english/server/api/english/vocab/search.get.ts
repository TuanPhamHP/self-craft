/**
 * GET /api/english/vocab/search?q=<word> — tra 1 từ trong scope user hiện tại.
 *
 * Scope match: từ hệ thống (`created_by IS NULL`) HOẶC từ private của user (`created_by = userId`).
 * Case-insensitive exact. Private thắng nếu trùng (user đã tạo nghĩa riêng → tôn trọng).
 *
 * Ngoài `vocab`, trả kèm:
 *  - `inUserQueue`: user đã có row trong eng_user_vocab hay chưa (đang học?).
 *    Cần vì sau restructure, có vocab trong DB (system word) KHÔNG đồng nghĩa user đang học.
 *
 * Không có match → `{ vocab: null }` → client fallback Free Dictionary API.
 */

import { and, eq, isNull, or, sql } from 'drizzle-orm'
import { z } from 'zod'
import { engUserVocab, engVocab } from '~~/server/database/schema'

const querySchema = z.object({
  q: z.string().trim().min(1, 'Cần từ khoá').max(100, 'Từ quá dài'),
})

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const userId = session.user.id

  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid search query',
      data: parsed.error.issues,
    })
  }

  const db = useDB()

  const [row] = await db
    .select()
    .from(engVocab)
    .where(
      and(
        or(isNull(engVocab.createdBy), eq(engVocab.createdBy, userId)),
        sql`LOWER(${engVocab.word}) = LOWER(${parsed.data.q})`,
      ),
    )
    // Private ưu tiên trước hệ thống (created_by IS NULL → 1 → sort sau).
    .orderBy(sql`${engVocab.createdBy} IS NULL`)
    .limit(1)

  if (!row) return { vocab: null, inUserQueue: false }

  // Check user đã có eng_user_vocab cho từ này chưa.
  const [queued] = await db
    .select({ userId: engUserVocab.userId })
    .from(engUserVocab)
    .where(and(eq(engUserVocab.userId, userId), eq(engUserVocab.vocabId, row.id)))
    .limit(1)

  return { vocab: row, inUserQueue: !!queued }
})
