import { integer, sqliteTable, text, index } from 'drizzle-orm/sqlite-core'

/**
 * eng_vocab — nội dung từ vựng tiếng Anh.
 * SRS state KHÔNG lưu ở đây → xem core_cards (module='english', itemId=eng_vocab.id).
 */
export const engVocab = sqliteTable(
  'eng_vocab',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),

    word: text('word').notNull(),              // từ tiếng Anh
    meaning: text('meaning').notNull(),        // nghĩa (Tiếng Việt)
    example: text('example').notNull(),        // câu ví dụ (bắt buộc — học có ngữ cảnh mới nhớ)
    ipa: text('ipa'),                          // phiên âm (nullable)

    createdAt: integer('created_at').notNull(), // epoch ms
    updatedAt: integer('updated_at').notNull(), // epoch ms
  },
  (t) => [
    // Tránh trùng từ (case-sensitive OK cho scope cá nhân 1 user).
    index('idx_eng_vocab_word').on(t.word),
  ],
)
