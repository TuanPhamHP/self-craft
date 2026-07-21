/**
 * GET /api/english/vocab/topics — danh sách chuyên ngành có trong pool hệ thống.
 *
 * Dùng cho USelect ở form "Nạp thêm từ mới" (empty state review): user chọn topic
 * để lọc pool trước khi bulk enroll. Chỉ lấy từ pool hệ thống (created_by IS NULL)
 * vì enroll flow cũng chỉ chọn từ pool hệ thống.
 *
 * Trả về mảng string đã distinct + sort. Không cache — dataset nhỏ, query rẻ.
 */

import { asc, isNotNull, isNull, and } from 'drizzle-orm'
import { engVocab } from '~~/server/database/schema'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)

  const db = useDB()
  const rows = await db
    .selectDistinct({ topic: engVocab.topic })
    .from(engVocab)
    .where(and(isNull(engVocab.createdBy), isNotNull(engVocab.topic)))
    .orderBy(asc(engVocab.topic))

  return rows
    .map((r) => r.topic)
    .filter((t): t is string => t !== null && t.length > 0)
})
