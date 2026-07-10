PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_eng_vocab` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`word` text NOT NULL,
	`meaning` text NOT NULL,
	`example` text NOT NULL,
	`ipa` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_eng_vocab`("id", "word", "meaning", "example", "ipa", "created_at", "updated_at") SELECT "id", "word", "meaning", "example", "ipa", "created_at", "updated_at" FROM `eng_vocab`;--> statement-breakpoint
DROP TABLE `eng_vocab`;--> statement-breakpoint
ALTER TABLE `__new_eng_vocab` RENAME TO `eng_vocab`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_eng_vocab_word` ON `eng_vocab` (`word`);