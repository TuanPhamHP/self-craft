CREATE TABLE `core_cards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`module` text NOT NULL,
	`item_id` integer NOT NULL,
	`due` integer NOT NULL,
	`stability` real NOT NULL,
	`difficulty` real NOT NULL,
	`elapsed_days` real NOT NULL,
	`scheduled_days` real NOT NULL,
	`reps` integer NOT NULL,
	`lapses` integer NOT NULL,
	`state` integer NOT NULL,
	`last_review` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_core_cards_module_due` ON `core_cards` (`module`,`due`);--> statement-breakpoint
CREATE INDEX `idx_core_cards_module_item` ON `core_cards` (`module`,`item_id`);--> statement-breakpoint
CREATE TABLE `core_review_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`card_id` integer NOT NULL,
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
	FOREIGN KEY (`card_id`) REFERENCES `core_cards`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_core_review_logs_reviewed_at` ON `core_review_logs` (`reviewed_at`);--> statement-breakpoint
CREATE INDEX `idx_core_review_logs_card_id` ON `core_review_logs` (`card_id`);--> statement-breakpoint
CREATE TABLE `eng_vocab` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`word` text NOT NULL,
	`meaning` text NOT NULL,
	`example` text,
	`ipa` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_eng_vocab_word` ON `eng_vocab` (`word`);