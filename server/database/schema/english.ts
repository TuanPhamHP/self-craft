import { integer, real, sqliteTable, text, index, uniqueIndex, primaryKey } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { coreUsers } from './core'

/**
 * eng_vocab — content pool tiếng Anh (dùng chung hệ thống + user-owned).
 *
 * `createdBy` NULLABLE — quyết định scope:
 *  - NULL  = từ hệ thống (seed), mọi user thấy được.
 *  - value = từ user tự thêm, chỉ user đó thấy (private).
 *
 * SRS state KHÔNG lưu ở đây → xem `eng_user_vocab` (per-user).
 *
 * Query "vocab trong scope user X" = WHERE created_by IS NULL OR created_by = X.
 * Query "vocab X đang học" = JOIN qua eng_user_vocab WHERE user_id = X.
 */
export const engVocab = sqliteTable(
  'eng_vocab',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),

    word: text('word').notNull(),               // từ tiếng Anh
    meaning: text('meaning').notNull(),         // nghĩa mặc định (VN); user có thể override bằng eng_user_vocab.note
    example: text('example').notNull(),         // câu ví dụ (bắt buộc — học có ngữ cảnh mới nhớ)
    ipa: text('ipa'),                            // phiên âm, nullable
    topic: text('topic'),                        // chuyên ngành free text: 'Lập trình', 'Kinh tế', ...
    band: text('band'),                          // CEFR A1|A2|B1|B2|C1|C2 (validate ở Zod, không CHECK DB để dễ đổi)
    pos: text('pos'),                            // part of speech: noun/verb/adjective/...

    createdBy: integer('created_by').references(() => coreUsers.id, { onDelete: 'cascade' }),

    createdAt: integer('created_at').notNull(), // epoch ms
    updatedAt: integer('updated_at').notNull(), // epoch ms
  },
  (t) => [
    // Partial unique: từ hệ thống UNIQUE theo word.
    uniqueIndex('uq_eng_vocab_system_word').on(t.word).where(sql`created_by IS NULL`),
    // Partial unique: user không thêm trùng từ trong scope của mình.
    uniqueIndex('uq_eng_vocab_user_word').on(t.createdBy, t.word).where(sql`created_by IS NOT NULL`),
    // Filter/group theo band + topic (dashboard, tìm kiếm).
    index('idx_eng_vocab_band').on(t.band),
    index('idx_eng_vocab_topic').on(t.topic),
  ],
)

/**
 * eng_user_vocab — trạng thái học của 1 user cho 1 vocab.
 *
 * PK (userId, vocabId): 1 user có tối đa 1 hàng cho 1 từ.
 * `note` — user personal note; hiển thị ở Review theo `note ?? eng_vocab.meaning`.
 *
 * SRS state mirror `SrsState` (shared/utils/srs.ts) — giữ đúng tên field để
 * wrapper srsReview/srsPreview không cần map lại.
 */
export const engUserVocab = sqliteTable(
  'eng_user_vocab',
  {
    userId: integer('user_id').notNull().references(() => coreUsers.id, { onDelete: 'cascade' }),
    vocabId: integer('vocab_id').notNull().references(() => engVocab.id, { onDelete: 'cascade' }),

    // ==== SRS state (mirror SrsState) ====
    due: integer('due').notNull(),               // epoch ms
    stability: real('stability').notNull(),
    difficulty: real('difficulty').notNull(),
    elapsedDays: real('elapsed_days').notNull(),
    scheduledDays: real('scheduled_days').notNull(),
    reps: integer('reps').notNull(),
    lapses: integer('lapses').notNull(),
    state: integer('state').notNull(),           // 0 New | 1 Learning | 2 Review | 3 Relearning
    lastReview: integer('last_review'),          // epoch ms, null nếu chưa review

    note: text('note'),                           // personal note (override meaning khi set)

    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.vocabId] }),
    // Query hot: card tới hạn của user X → filter (userId, state, due).
    index('idx_eng_user_vocab_user_state_due').on(t.userId, t.state, t.due),
    // FK vocabId cần index riêng — SQLite KHÔNG auto-index FK; cần cho CASCADE delete
    // và query "ai đang học từ X" (stats).
    index('idx_eng_user_vocab_vocab_id').on(t.vocabId),
  ],
)
