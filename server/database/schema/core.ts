import { integer, real, sqliteTable, text, index } from 'drizzle-orm/sqlite-core'

/**
 * core_cards — SRS state chung cho MỌI loại card (English vocab, Programming concept, ...).
 * - Content (word, meaning, ...) nằm ở bảng riêng của module (vd `eng_vocab`).
 * - Tham chiếu module + itemId → giữ SRS engine module-agnostic.
 * - Date lưu epoch ms (integer) — D1 = SQLite, không có Date native; SrsState (shared/utils/srs.ts) cũng dùng epoch ms.
 */
export const coreCards = sqliteTable(
  'core_cards',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),

    // Module owner: 'english' | 'programming' | ...
    module: text('module').notNull(),
    // Khoá item bên module (vd id của eng_vocab). Combo (module, itemId) là unique logic.
    itemId: integer('item_id').notNull(),

    // ==== SRS state (mirror shared/utils/srs.ts SrsState) ====
    due: integer('due').notNull(), // epoch ms — thời điểm tới hạn review
    stability: real('stability').notNull(),
    difficulty: real('difficulty').notNull(),
    elapsedDays: real('elapsed_days').notNull(),
    scheduledDays: real('scheduled_days').notNull(),
    reps: integer('reps').notNull(),
    lapses: integer('lapses').notNull(),
    // 0 New | 1 Learning | 2 Review | 3 Relearning
    state: integer('state').notNull(),
    lastReview: integer('last_review'), // epoch ms, null nếu chưa review

    createdAt: integer('created_at').notNull(), // epoch ms
    updatedAt: integer('updated_at').notNull(), // epoch ms
  },
  (t) => [
    // Query nóng: "card tới hạn theo module" → filter module + due <= now.
    index('idx_core_cards_module_due').on(t.module, t.due),
    // Lookup nhanh theo (module, itemId) — dùng khi nạp/cập nhật state của 1 item cụ thể.
    index('idx_core_cards_module_item').on(t.module, t.itemId),
  ],
)

/**
 * core_review_logs — audit trail cho mỗi lần review.
 * Dùng cho stats (Phase 2): streak, retention rate, review count.
 * Không bao giờ DROP/rewrite — data tích luỹ, chỉ append.
 */
export const coreReviewLogs = sqliteTable(
  'core_review_logs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    cardId: integer('card_id').notNull().references(() => coreCards.id),

    // 1 Again | 2 Hard | 3 Good | 4 Easy (đồng bộ với Grade trong shared/utils/srs.ts)
    grade: integer('grade').notNull(),

    // Snapshot state TRƯỚC khi review — cho phép replay/rollback nếu đổi engine.
    stateBefore: integer('state_before').notNull(),
    stabilityBefore: real('stability_before').notNull(),
    difficultyBefore: real('difficulty_before').notNull(),

    // Snapshot state SAU khi review — nhanh cho stats khỏi phải recompute.
    stateAfter: integer('state_after').notNull(),
    stabilityAfter: real('stability_after').notNull(),
    difficultyAfter: real('difficulty_after').notNull(),
    scheduledDaysAfter: real('scheduled_days_after').notNull(),
    dueAfter: integer('due_after').notNull(), // epoch ms

    reviewedAt: integer('reviewed_at').notNull(), // epoch ms
  },
  (t) => [
    // Stats theo thời gian → filter reviewedAt.
    index('idx_core_review_logs_reviewed_at').on(t.reviewedAt),
    // Lookup logs của 1 card cụ thể.
    index('idx_core_review_logs_card_id').on(t.cardId),
  ],
)
