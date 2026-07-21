CREATE TABLE `core_cards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
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
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `core_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_core_cards_user_module_due` ON `core_cards` (`user_id`,`module`,`due`);--> statement-breakpoint
CREATE INDEX `idx_core_cards_user_module_item` ON `core_cards` (`user_id`,`module`,`item_id`);--> statement-breakpoint
CREATE TABLE `core_invites` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`token_hash` text NOT NULL,
	`invited_by` integer,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`invited_by`) REFERENCES `core_users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_core_invites_token_hash` ON `core_invites` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_core_invites_email` ON `core_invites` (`email`);--> statement-breakpoint
CREATE TABLE `core_password_resets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `core_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_core_password_resets_token_hash` ON `core_password_resets` (`token_hash`);--> statement-breakpoint
CREATE TABLE `core_review_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
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
	FOREIGN KEY (`user_id`) REFERENCES `core_users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`card_id`) REFERENCES `core_cards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_core_review_logs_user_reviewed_at` ON `core_review_logs` (`user_id`,`reviewed_at`);--> statement-breakpoint
CREATE INDEX `idx_core_review_logs_card_id` ON `core_review_logs` (`card_id`);--> statement-breakpoint
CREATE TABLE `core_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`is_admin` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_core_users_email` ON `core_users` (`email`);--> statement-breakpoint
CREATE TABLE `eng_vocab` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`word` text NOT NULL,
	`meaning` text NOT NULL,
	`example` text NOT NULL,
	`ipa` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `core_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_eng_vocab_user_word` ON `eng_vocab` (`user_id`,`word`);