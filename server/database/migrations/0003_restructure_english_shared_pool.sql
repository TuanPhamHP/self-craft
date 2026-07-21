--============================================================================
-- 0003_restructure_english_shared_pool
--
-- Tách English vocab 2 lớp:
--   eng_vocab       : content pool (created_by NULL = hệ thống, có value = private user)
--   eng_user_vocab  : SRS state + personal note per (user_id, vocab_id)
--
-- core_review_logs sửa module-agnostic (module + item_id thay card_id FK).
--   RESET data (theo quyết định của owner — chỉ chạy khi COUNT(*) <= vài trăm).
--
-- core_cards giữ nguyên schema (chờ Programming P2). Dọn hết row module='english'.
--
-- PRE-FLIGHT bắt buộc trước khi apply (verify thủ công, migration KHÔNG tự gate):
--   wrangler d1 execute self-craft-db --local  --command "SELECT COUNT(*) AS n FROM core_review_logs"
--   wrangler d1 execute self-craft-db --remote --command "SELECT COUNT(*) AS n FROM core_review_logs"
--   Nếu n > ~200: DỪNG lại báo owner. Log cũ sẽ mất khi migration chạy.
--   Ngoài ra: chạy `db:dump:remote` TRƯỚC db:migrate:remote (bắt buộc, có snapshot phục hồi).
--============================================================================

--------------------------------------------------------------------------
-- Step 1. Recreate core_review_logs (drop card_id FK, add module + item_id).
-- SQLite không DROP FK inline được → recreate table. Data policy: RESET.
--------------------------------------------------------------------------
DROP INDEX IF EXISTS `idx_core_review_logs_user_reviewed_at`;--> statement-breakpoint
DROP INDEX IF EXISTS `idx_core_review_logs_card_id`;--> statement-breakpoint
DROP TABLE `core_review_logs`;--> statement-breakpoint

CREATE TABLE `core_review_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`module` text NOT NULL,
	`item_id` integer NOT NULL,
	`grade` integer NOT NULL,
	`state_before` integer NOT NULL,
	`stability_before` real NOT NULL,
	`difficulty_before` real NOT NULL,
	`state_after` integer NOT NULL,
	`stability_after` real NOT NULL,
	`difficulty_after` real NOT NULL,
	`scheduled_days_after` real NOT NULL,
	`due_after` integer NOT NULL,
	`reviewed_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `core_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_core_review_logs_user_reviewed_at` ON `core_review_logs` (`user_id`,`reviewed_at`);--> statement-breakpoint
CREATE INDEX `idx_core_review_logs_user_module_item` ON `core_review_logs` (`user_id`,`module`,`item_id`);--> statement-breakpoint

--------------------------------------------------------------------------
-- Step 2. Recreate eng_vocab: drop user_id, add created_by (nullable FK) + pos.
-- Backfill: created_by = user_id cũ (mọi vocab hiện tại là user tự thêm → giữ ownership).
-- Không có FK external nào ref eng_vocab trước migration này (core_cards.item_id KHÔNG FK)
-- → drop bảng cũ an toàn.
--------------------------------------------------------------------------
DROP INDEX IF EXISTS `idx_eng_vocab_user_word`;--> statement-breakpoint
DROP INDEX IF EXISTS `idx_eng_vocab_user_band`;--> statement-breakpoint
DROP INDEX IF EXISTS `idx_eng_vocab_user_topic`;--> statement-breakpoint

CREATE TABLE `__new_eng_vocab` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`word` text NOT NULL,
	`meaning` text NOT NULL,
	`example` text NOT NULL,
	`ipa` text,
	`topic` text,
	`band` text,
	`pos` text,
	`created_by` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `core_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

-- Backfill row cũ. Giữ nguyên `id` để nếu sau có ref (eng_user_vocab backfill ở Step 3) khớp.
INSERT INTO `__new_eng_vocab` (
	`id`, `word`, `meaning`, `example`, `ipa`, `topic`, `band`, `pos`, `created_by`, `created_at`, `updated_at`
)
SELECT
	`id`, `word`, `meaning`, `example`, `ipa`, `topic`, `band`, NULL, `user_id`, `created_at`, `updated_at`
FROM `eng_vocab`;
--> statement-breakpoint

DROP TABLE `eng_vocab`;--> statement-breakpoint
ALTER TABLE `__new_eng_vocab` RENAME TO `eng_vocab`;--> statement-breakpoint

-- Partial unique indexes:
--   - Từ hệ thống unique theo word.
--   - User không thêm trùng từ trong scope của mình.
CREATE UNIQUE INDEX `uq_eng_vocab_system_word` ON `eng_vocab` (`word`) WHERE created_by IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `uq_eng_vocab_user_word` ON `eng_vocab` (`created_by`,`word`) WHERE created_by IS NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_eng_vocab_band` ON `eng_vocab` (`band`);--> statement-breakpoint
CREATE INDEX `idx_eng_vocab_topic` ON `eng_vocab` (`topic`);--> statement-breakpoint

--------------------------------------------------------------------------
-- Step 3. Create eng_user_vocab. Backfill từ core_cards WHERE module='english'.
-- Chỉ copy card có item_id trỏ tới eng_vocab.id còn tồn tại (bảo vệ nếu có orphan).
--------------------------------------------------------------------------
CREATE TABLE `eng_user_vocab` (
	`user_id` integer NOT NULL,
	`vocab_id` integer NOT NULL,
	`due` integer NOT NULL,
	`stability` real NOT NULL,
	`difficulty` real NOT NULL,
	`elapsed_days` real NOT NULL,
	`scheduled_days` real NOT NULL,
	`reps` integer NOT NULL,
	`lapses` integer NOT NULL,
	`state` integer NOT NULL,
	`last_review` integer,
	`note` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `vocab_id`),
	FOREIGN KEY (`user_id`) REFERENCES `core_users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`vocab_id`) REFERENCES `eng_vocab`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_eng_user_vocab_user_state_due` ON `eng_user_vocab` (`user_id`,`state`,`due`);--> statement-breakpoint
CREATE INDEX `idx_eng_user_vocab_vocab_id` ON `eng_user_vocab` (`vocab_id`);--> statement-breakpoint

INSERT INTO `eng_user_vocab` (
	`user_id`, `vocab_id`, `due`, `stability`, `difficulty`, `elapsed_days`, `scheduled_days`,
	`reps`, `lapses`, `state`, `last_review`, `note`, `created_at`, `updated_at`
)
SELECT
	c.`user_id`, c.`item_id`, c.`due`, c.`stability`, c.`difficulty`, c.`elapsed_days`, c.`scheduled_days`,
	c.`reps`, c.`lapses`, c.`state`, c.`last_review`, NULL, c.`created_at`, c.`updated_at`
FROM `core_cards` AS c
WHERE c.`module` = 'english'
  AND EXISTS (SELECT 1 FROM `eng_vocab` AS v WHERE v.`id` = c.`item_id`);
--> statement-breakpoint

--------------------------------------------------------------------------
-- Step 4. Dọn core_cards english (giữ table cho Programming P2).
--------------------------------------------------------------------------
DELETE FROM `core_cards` WHERE `module` = 'english';
