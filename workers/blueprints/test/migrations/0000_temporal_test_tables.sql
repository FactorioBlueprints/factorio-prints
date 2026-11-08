CREATE TABLE `content` (
	`sha` text PRIMARY KEY NOT NULL,
	`created_by_id` text NOT NULL,
	`byte_length` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `item` (
	`key` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`system_from` integer NOT NULL,
	`system_to` integer DEFAULT 253402300799999 NOT NULL,
	`system_from_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_from / 1000.0, 'unixepoch')) VIRTUAL,
	`system_to_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_to / 1000.0, 'unixepoch')) VIRTUAL,
	PRIMARY KEY(`key`, `system_to`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `item_system_from_idx` ON `item` (`key`,`system_from`);--> statement-breakpoint
CREATE TABLE `item_part` (
	`item_key` text NOT NULL,
	`position` integer NOT NULL,
	`count` integer NOT NULL,
	`system_from` integer NOT NULL,
	`system_to` integer DEFAULT 253402300799999 NOT NULL,
	`system_from_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_from / 1000.0, 'unixepoch')) VIRTUAL,
	`system_to_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_to / 1000.0, 'unixepoch')) VIRTUAL,
	PRIMARY KEY(`item_key`, `position`, `system_to`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `item_part_system_from_idx` ON `item_part` (`item_key`,`position`,`system_from`);--> statement-breakpoint
CREATE TABLE `item_version` (
	`key` text NOT NULL,
	`number` integer NOT NULL,
	`system_from` integer NOT NULL,
	`system_to` integer DEFAULT 253402300799999 NOT NULL,
	`system_from_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_from / 1000.0, 'unixepoch')) VIRTUAL,
	`system_to_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_to / 1000.0, 'unixepoch')) VIRTUAL,
	PRIMARY KEY(`key`, `system_to`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `item_version_system_from_idx` ON `item_version` (`key`,`system_from`);
