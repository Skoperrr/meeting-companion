CREATE TABLE `meetings` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`meeting_date` text NOT NULL,
	`transcript` text NOT NULL,
	`analysis` text NOT NULL,
	`review_state` text DEFAULT 'pending' NOT NULL,
	`analysis_source` text NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT "meetings_review_valid" CHECK("meetings"."review_state" IN ('pending','approved'))
);
--> statement-breakpoint
CREATE INDEX `meetings_created_idx` ON `meetings` (`created_at`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`meeting_id` text NOT NULL,
	`proposal_index` integer NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`assigned_to` text NOT NULL,
	`due_date` text NOT NULL,
	`priority` text NOT NULL,
	`status` text DEFAULT 'To Do' NOT NULL,
	`transcript_quote` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`meeting_id`) REFERENCES `meetings`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "tasks_status_valid" CHECK("tasks"."status" IN ('To Do','In Progress','Blocked','In Review','Completed')),
	CONSTRAINT "tasks_priority_valid" CHECK("tasks"."priority" IN ('Low','Med','High'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_proposal_unique` ON `tasks` (`meeting_id`,`proposal_index`);--> statement-breakpoint
CREATE INDEX `tasks_meeting_idx` ON `tasks` (`meeting_id`);--> statement-breakpoint
CREATE INDEX `tasks_status_idx` ON `tasks` (`status`);