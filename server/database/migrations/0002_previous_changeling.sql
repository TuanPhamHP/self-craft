ALTER TABLE `eng_vocab` ADD `topic` text;--> statement-breakpoint
ALTER TABLE `eng_vocab` ADD `band` text;--> statement-breakpoint
CREATE INDEX `idx_eng_vocab_user_band` ON `eng_vocab` (`user_id`,`band`);--> statement-breakpoint
CREATE INDEX `idx_eng_vocab_user_topic` ON `eng_vocab` (`user_id`,`topic`);