import { integer, real, sqliteTable, text, index, uniqueIndex } from 'drizzle-orm/sqlite-core'

/**
 * core_users — tài khoản trong app.
 * - `email` unique (case-insensitive; luôn lowercase khi ghi/đọc, xem shared/schemas/auth).
 * - `passwordHash` scrypt (nuxt-auth-utils hashPassword).
 * - `isAdmin` = có quyền gửi invite. First-registered user auto = true (bootstrap khi DB rỗng).
 */
export const coreUsers = sqliteTable(
  'core_users',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    email: text('email').notNull(),
    // Tên hiển thị — nullable vì register chỉ nhập email; user điền lần đầu qua modal AskName.
    name: text('name'),
    passwordHash: text('password_hash').notNull(),
    isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [uniqueIndex('uq_core_users_email').on(t.email)],
)

/**
 * core_invites — token mời đăng ký (invite-only registration).
 * - `tokenHash` = SHA-256 của token raw (raw token chỉ có trong link email); DB leak != token dùng được.
 * - `usedAt` != null → đã dùng, không cho register lại.
 * - `invitedBy` SET NULL nếu admin bị xoá (audit không critical).
 */
export const coreInvites = sqliteTable(
  'core_invites',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    email: text('email').notNull(),
    tokenHash: text('token_hash').notNull(),
    invitedBy: integer('invited_by').references(() => coreUsers.id, { onDelete: 'set null' }),
    expiresAt: integer('expires_at').notNull(), // epoch ms
    usedAt: integer('used_at'), // epoch ms
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    uniqueIndex('uq_core_invites_token_hash').on(t.tokenHash),
    index('idx_core_invites_email').on(t.email),
  ],
)

/**
 * core_password_resets — token reset password.
 * Cùng nguyên tắc hash như invites. TTL ngắn (1 giờ, enforce ở app-level qua expiresAt).
 */
export const corePasswordResets = sqliteTable(
  'core_password_resets',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull().references(() => coreUsers.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: integer('expires_at').notNull(),
    usedAt: integer('used_at'),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [uniqueIndex('uq_core_password_resets_token_hash').on(t.tokenHash)],
)

/**
 * core_cards — SRS state chung cho MỌI loại card (English vocab, Programming concept, ...).
 * - Scope theo `userId` (multi-user); mọi query PHẢI filter userId để tránh leak cross-user.
 * - Content (word, meaning, ...) nằm ở bảng riêng của module (vd `eng_vocab`).
 * - Tham chiếu module + itemId → giữ SRS engine module-agnostic.
 * - Date lưu epoch ms (integer) — D1 = SQLite, không có Date native; SrsState (shared/utils/srs.ts) cũng dùng epoch ms.
 */
export const coreCards = sqliteTable(
  'core_cards',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull().references(() => coreUsers.id, { onDelete: 'cascade' }),

    // Module owner: 'english' | 'programming' | ...
    module: text('module').notNull(),
    // Khoá item bên module (vd id của eng_vocab). Combo (userId, module, itemId) là unique logic.
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
    // Query nóng: "card tới hạn của user X trong module Y" → filter userId + module + due <= now.
    index('idx_core_cards_user_module_due').on(t.userId, t.module, t.due),
    // Lookup nhanh theo (userId, module, itemId) — dùng khi nạp/cập nhật state của 1 item cụ thể.
    index('idx_core_cards_user_module_item').on(t.userId, t.module, t.itemId),
  ],
)

/**
 * core_review_logs — audit trail cho mỗi lần review.
 *
 * Module-agnostic: tham chiếu (module, itemId) thay vì FK card cụ thể.
 * Ví dụ English: module='english', itemId = eng_vocab.id.
 * Không FK cứng để cho phép mỗi module có bảng SRS riêng (eng_user_vocab, prog_user_concept, ...).
 *
 * Không bao giờ DROP/rewrite — data tích luỹ, chỉ append.
 * Scope userId để stats theo user; CASCADE cùng user.
 */
export const coreReviewLogs = sqliteTable(
  'core_review_logs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull().references(() => coreUsers.id, { onDelete: 'cascade' }),

    module: text('module').notNull(),           // 'english' | 'programming' | ...
    itemId: integer('item_id').notNull(),        // eng_vocab.id / prog_concept.id / ...

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
    // Stats theo thời gian của 1 user → filter (userId, reviewedAt).
    index('idx_core_review_logs_user_reviewed_at').on(t.userId, t.reviewedAt),
    // Lookup logs của 1 item cụ thể (audit / debug).
    index('idx_core_review_logs_user_module_item').on(t.userId, t.module, t.itemId),
  ],
)
