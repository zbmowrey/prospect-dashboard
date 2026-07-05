CREATE TABLE `captures` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`prospect_id` integer NOT NULL,
	`page_label` text DEFAULT 'landing' NOT NULL,
	`url` text NOT NULL,
	`thumb_path` text NOT NULL,
	`screenshot_path` text NOT NULL,
	`width` integer,
	`height` integer,
	`captured_at` integer NOT NULL,
	FOREIGN KEY (`prospect_id`) REFERENCES `prospects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `prospects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`website` text NOT NULL,
	`domain` text NOT NULL,
	`city` text,
	`state` text,
	`phone` text,
	`industry` text,
	`est_size` text,
	`saas_needs` text,
	`notes` text,
	`source` text,
	`status` text DEFAULT 'new' NOT NULL,
	`capture_status` text DEFAULT 'pending' NOT NULL,
	`capture_error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `prospects_domain_unique` ON `prospects` (`domain`);