CREATE TABLE `blueprint` (
	`key` text NOT NULL,
	`imgur_image_id` text NOT NULL,
	`blueprint_string_sha` text NOT NULL,
	`system_from` integer NOT NULL,
	`system_to` integer DEFAULT 253402300799999 NOT NULL,
	`created_by_id` text NOT NULL,
	`created_on` integer NOT NULL,
	`last_updated_by_id` text NOT NULL,
	`title` text NOT NULL,
	`description_markdown` text NOT NULL,
	`system_from_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_from / 1000.0, 'unixepoch')) VIRTUAL,
	`system_to_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_to / 1000.0, 'unixepoch')) VIRTUAL,
	`created_on_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', created_on / 1000.0, 'unixepoch')) VIRTUAL,
	PRIMARY KEY(`key`, `system_to`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `blueprint_system_from_idx` ON `blueprint` (`key`,`system_from`);--> statement-breakpoint
CREATE INDEX `blueprint_idx_imgur_image` ON `blueprint` (`imgur_image_id`,`system_to`);--> statement-breakpoint
CREATE INDEX `blueprint_idx_blueprint_string` ON `blueprint` (`blueprint_string_sha`,`system_to`);--> statement-breakpoint
CREATE INDEX `blueprint_idx_author` ON `blueprint` (`created_by_id`,`system_to`);--> statement-breakpoint
CREATE INDEX `blueprint_idx_last_updated_by` ON `blueprint` (`last_updated_by_id`,`system_to`);--> statement-breakpoint
CREATE INDEX `blueprint_idx_system_to_from` ON `blueprint` (`system_to`,`system_from`);--> statement-breakpoint
CREATE TABLE `blueprint_collection_entry` (
	`user_id` text NOT NULL,
	`blueprint_key` text NOT NULL,
	`system_from` integer NOT NULL,
	`system_to` integer DEFAULT 253402300799999 NOT NULL,
	`system_from_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_from / 1000.0, 'unixepoch')) VIRTUAL,
	`system_to_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_to / 1000.0, 'unixepoch')) VIRTUAL,
	PRIMARY KEY(`user_id`, `blueprint_key`, `system_to`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `blueprint_collection_entry_system_from_idx` ON `blueprint_collection_entry` (`user_id`,`blueprint_key`,`system_from`);--> statement-breakpoint
CREATE INDEX `blueprint_collection_entry_idx_firebase_user` ON `blueprint_collection_entry` (`user_id`,`system_to`);--> statement-breakpoint
CREATE INDEX `blueprint_collection_entry_idx_blueprint` ON `blueprint_collection_entry` (`blueprint_key`,`system_to`);--> statement-breakpoint
CREATE INDEX `blueprint_collection_entry_idx_system_to_from` ON `blueprint_collection_entry` (`system_to`,`system_from`);--> statement-breakpoint
CREATE TABLE `blueprint_game_data` (
	`sha` text NOT NULL,
	`position` text NOT NULL,
	`version_number` integer,
	`version1` integer,
	`version2` integer,
	`version3` integer,
	`version4` integer,
	`version_string` text,
	`label` text,
	`item_type` text,
	PRIMARY KEY(`sha`, `position`)
);
--> statement-breakpoint
CREATE INDEX `blueprint_game_data_idx_factorio_game_version` ON `blueprint_game_data` (`version_number`);--> statement-breakpoint
CREATE TABLE `blueprint_game_data_entity` (
	`sha` text NOT NULL,
	`position` text NOT NULL,
	`entity` text NOT NULL,
	`count` integer NOT NULL,
	PRIMARY KEY(`sha`, `position`, `entity`)
);
--> statement-breakpoint
CREATE TABLE `blueprint_game_data_icon` (
	`sha` text NOT NULL,
	`position` text NOT NULL,
	`index` integer NOT NULL,
	`signal_name` text NOT NULL,
	`signal_type` text NOT NULL,
	PRIMARY KEY(`sha`, `position`, `index`)
);
--> statement-breakpoint
CREATE TABLE `blueprint_game_data_recipe` (
	`sha` text NOT NULL,
	`position` text NOT NULL,
	`recipe` text NOT NULL,
	`count` integer NOT NULL,
	PRIMARY KEY(`sha`, `position`, `recipe`)
);
--> statement-breakpoint
CREATE TABLE `blueprint_private_data` (
	`key` text NOT NULL,
	`system_from` integer NOT NULL,
	`system_to` integer DEFAULT 253402300799999 NOT NULL,
	`firebase_image_url` text,
	`thumbnail_data` text,
	`file_name` text,
	`system_from_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_from / 1000.0, 'unixepoch')) VIRTUAL,
	`system_to_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_to / 1000.0, 'unixepoch')) VIRTUAL,
	PRIMARY KEY(`key`, `system_to`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `blueprint_private_data_system_from_idx` ON `blueprint_private_data` (`key`,`system_from`);--> statement-breakpoint
CREATE INDEX `blueprint_private_data_idx_system_to_from` ON `blueprint_private_data` (`system_to`,`system_from`);--> statement-breakpoint
CREATE TABLE `blueprint_string` (
	`sha` text PRIMARY KEY NOT NULL,
	`created_by_id` text NOT NULL,
	`created_on` integer NOT NULL,
	`blueprint_string` text NOT NULL,
	`created_on_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', created_on / 1000.0, 'unixepoch')) VIRTUAL
);
--> statement-breakpoint
CREATE INDEX `blueprint_string_idx_created_by` ON `blueprint_string` (`created_by_id`);--> statement-breakpoint
CREATE TABLE `blueprint_string_mod` (
	`blueprint_string_sha` text NOT NULL,
	`mod_pack_name` text NOT NULL,
	PRIMARY KEY(`blueprint_string_sha`, `mod_pack_name`)
);
--> statement-breakpoint
CREATE INDEX `blueprint_string_mod_idx_mod_pack` ON `blueprint_string_mod` (`mod_pack_name`);--> statement-breakpoint
CREATE TABLE `blueprint_tag` (
	`blueprint_key` text NOT NULL,
	`tag_category` text NOT NULL,
	`tag_name` text NOT NULL,
	`system_from` integer NOT NULL,
	`system_to` integer DEFAULT 253402300799999 NOT NULL,
	`system_from_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_from / 1000.0, 'unixepoch')) VIRTUAL,
	`system_to_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_to / 1000.0, 'unixepoch')) VIRTUAL,
	PRIMARY KEY(`blueprint_key`, `tag_category`, `tag_name`, `system_to`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `blueprint_tag_system_from_idx` ON `blueprint_tag` (`blueprint_key`,`tag_category`,`tag_name`,`system_from`);--> statement-breakpoint
CREATE INDEX `blueprint_tag_idx_blueprint` ON `blueprint_tag` (`blueprint_key`,`system_to`);--> statement-breakpoint
CREATE INDEX `blueprint_tag_idx_tag` ON `blueprint_tag` (`tag_category`,`tag_name`,`system_to`);--> statement-breakpoint
CREATE INDEX `blueprint_tag_idx_system_to_from` ON `blueprint_tag` (`system_to`,`system_from`);--> statement-breakpoint
CREATE TABLE `blueprint_version` (
	`key` text NOT NULL,
	`system_from` integer NOT NULL,
	`system_to` integer DEFAULT 253402300799999 NOT NULL,
	`created_by_id` text NOT NULL,
	`created_on` integer NOT NULL,
	`last_updated_by_id` text NOT NULL,
	`number` integer NOT NULL,
	`system_from_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_from / 1000.0, 'unixepoch')) VIRTUAL,
	`system_to_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_to / 1000.0, 'unixepoch')) VIRTUAL,
	`created_on_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', created_on / 1000.0, 'unixepoch')) VIRTUAL,
	PRIMARY KEY(`key`, `system_to`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `blueprint_version_system_from_idx` ON `blueprint_version` (`key`,`system_from`);--> statement-breakpoint
CREATE INDEX `blueprint_version_idx_created_by` ON `blueprint_version` (`created_by_id`,`system_to`);--> statement-breakpoint
CREATE INDEX `blueprint_version_idx_last_updated_by` ON `blueprint_version` (`last_updated_by_id`,`system_to`);--> statement-breakpoint
CREATE INDEX `blueprint_version_idx_system_to_from` ON `blueprint_version` (`system_to`,`system_from`);--> statement-breakpoint
CREATE TABLE `blueprint_vote_summary` (
	`key` text PRIMARY KEY NOT NULL,
	`number_of_upvotes` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `comment` (
	`id` text NOT NULL,
	`reply_to_id` text,
	`system_from` integer NOT NULL,
	`system_to` integer DEFAULT 253402300799999 NOT NULL,
	`created_by_id` text NOT NULL,
	`created_on` integer NOT NULL,
	`last_updated_by_id` text NOT NULL,
	`blueprint_key` text NOT NULL,
	`text` text NOT NULL,
	`deleted` integer NOT NULL,
	`system_from_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_from / 1000.0, 'unixepoch')) VIRTUAL,
	`system_to_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_to / 1000.0, 'unixepoch')) VIRTUAL,
	`created_on_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', created_on / 1000.0, 'unixepoch')) VIRTUAL,
	PRIMARY KEY(`id`, `system_to`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `comment_system_from_idx` ON `comment` (`id`,`system_from`);--> statement-breakpoint
CREATE INDEX `comment_idx_reply_to` ON `comment` (`reply_to_id`,`system_to`);--> statement-breakpoint
CREATE INDEX `comment_idx_created_by` ON `comment` (`created_by_id`,`system_to`);--> statement-breakpoint
CREATE INDEX `comment_idx_last_updated_by` ON `comment` (`last_updated_by_id`,`system_to`);--> statement-breakpoint
CREATE INDEX `comment_idx_system_to_from` ON `comment` (`system_to`,`system_from`);--> statement-breakpoint
CREATE TABLE `comment_version` (
	`id` text NOT NULL,
	`system_from` integer NOT NULL,
	`system_to` integer DEFAULT 253402300799999 NOT NULL,
	`created_by_id` text NOT NULL,
	`created_on` integer NOT NULL,
	`last_updated_by_id` text NOT NULL,
	`number` integer NOT NULL,
	`system_from_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_from / 1000.0, 'unixepoch')) VIRTUAL,
	`system_to_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_to / 1000.0, 'unixepoch')) VIRTUAL,
	`created_on_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', created_on / 1000.0, 'unixepoch')) VIRTUAL,
	PRIMARY KEY(`id`, `system_to`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `comment_version_system_from_idx` ON `comment_version` (`id`,`system_from`);--> statement-breakpoint
CREATE INDEX `comment_version_idx_created_by` ON `comment_version` (`created_by_id`,`system_to`);--> statement-breakpoint
CREATE INDEX `comment_version_idx_last_updated_by` ON `comment_version` (`last_updated_by_id`,`system_to`);--> statement-breakpoint
CREATE INDEX `comment_version_idx_system_to_from` ON `comment_version` (`system_to`,`system_from`);--> statement-breakpoint
CREATE TABLE `comment_vote` (
	`user_id` text NOT NULL,
	`comment_id` text NOT NULL,
	`system_from` integer NOT NULL,
	`system_to` integer DEFAULT 253402300799999 NOT NULL,
	`direction` text NOT NULL,
	`system_from_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_from / 1000.0, 'unixepoch')) VIRTUAL,
	`system_to_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_to / 1000.0, 'unixepoch')) VIRTUAL,
	PRIMARY KEY(`user_id`, `comment_id`, `system_to`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `comment_vote_system_from_idx` ON `comment_vote` (`user_id`,`comment_id`,`system_from`);--> statement-breakpoint
CREATE INDEX `comment_vote_idx_user` ON `comment_vote` (`user_id`,`system_to`);--> statement-breakpoint
CREATE INDEX `comment_vote_idx_comment` ON `comment_vote` (`comment_id`,`system_to`);--> statement-breakpoint
CREATE INDEX `comment_vote_idx_system_to_from` ON `comment_vote` (`system_to`,`system_from`);--> statement-breakpoint
CREATE TABLE `data_import_timestamp` (
	`name` text NOT NULL,
	`system_from` integer NOT NULL,
	`system_to` integer DEFAULT 253402300799999 NOT NULL,
	`timestamp` integer NOT NULL,
	`system_from_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_from / 1000.0, 'unixepoch')) VIRTUAL,
	`system_to_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_to / 1000.0, 'unixepoch')) VIRTUAL,
	`timestamp_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', timestamp / 1000.0, 'unixepoch')) VIRTUAL,
	PRIMARY KEY(`name`, `system_to`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `data_import_timestamp_system_from_idx` ON `data_import_timestamp` (`name`,`system_from`);--> statement-breakpoint
CREATE INDEX `data_import_timestamp_idx_system_to_from` ON `data_import_timestamp` (`system_to`,`system_from`);--> statement-breakpoint
CREATE TABLE `disqus_comment` (
	`id` integer NOT NULL,
	`reply_to_id` integer,
	`author_name` text,
	`system_from` integer NOT NULL,
	`system_to` integer DEFAULT 253402300799999 NOT NULL,
	`created_on` integer,
	`blueprint_key` text NOT NULL,
	`text` text NOT NULL,
	`deleted` integer NOT NULL,
	`system_from_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_from / 1000.0, 'unixepoch')) VIRTUAL,
	`system_to_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_to / 1000.0, 'unixepoch')) VIRTUAL,
	`created_on_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', created_on / 1000.0, 'unixepoch')) VIRTUAL,
	PRIMARY KEY(`id`, `system_to`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `disqus_comment_system_from_idx` ON `disqus_comment` (`id`,`system_from`);--> statement-breakpoint
CREATE INDEX `disqus_comment_idx_reply_to` ON `disqus_comment` (`reply_to_id`,`system_to`);--> statement-breakpoint
CREATE INDEX `disqus_comment_idx_author` ON `disqus_comment` (`author_name`,`system_to`);--> statement-breakpoint
CREATE INDEX `disqus_comment_idx_system_to_from` ON `disqus_comment` (`system_to`,`system_from`);--> statement-breakpoint
CREATE TABLE `disqus_user` (
	`username` text NOT NULL,
	`system_from` integer NOT NULL,
	`system_to` integer DEFAULT 253402300799999 NOT NULL,
	`name` text NOT NULL,
	`anonymous` integer NOT NULL,
	`system_from_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_from / 1000.0, 'unixepoch')) VIRTUAL,
	`system_to_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_to / 1000.0, 'unixepoch')) VIRTUAL,
	PRIMARY KEY(`username`, `system_to`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `disqus_user_system_from_idx` ON `disqus_user` (`username`,`system_from`);--> statement-breakpoint
CREATE INDEX `disqus_user_idx_system_to_from` ON `disqus_user` (`system_to`,`system_from`);--> statement-breakpoint
CREATE TABLE `entity_mod_mapping` (
	`entity_name` text NOT NULL,
	`mod` text NOT NULL,
	`system_from` integer NOT NULL,
	`system_to` integer DEFAULT 253402300799999 NOT NULL,
	`system_from_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_from / 1000.0, 'unixepoch')) VIRTUAL,
	`system_to_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_to / 1000.0, 'unixepoch')) VIRTUAL,
	PRIMARY KEY(`entity_name`, `mod`, `system_to`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `entity_mod_mapping_system_from_idx` ON `entity_mod_mapping` (`entity_name`,`mod`,`system_from`);--> statement-breakpoint
CREATE INDEX `entity_mod_mapping_idx_entity` ON `entity_mod_mapping` (`entity_name`,`system_to`);--> statement-breakpoint
CREATE INDEX `entity_mod_mapping_idx_system_to_from` ON `entity_mod_mapping` (`system_to`,`system_from`);--> statement-breakpoint
CREATE TABLE `factorio_game_version` (
	`version_number` integer PRIMARY KEY NOT NULL,
	`version1` integer NOT NULL,
	`version2` integer NOT NULL,
	`version3` integer NOT NULL,
	`version4` integer NOT NULL,
	`version_string` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `factorio_item` (
	`name` text NOT NULL,
	`mod_pack_name` text NOT NULL,
	`system_from` integer NOT NULL,
	`system_to` integer DEFAULT 253402300799999 NOT NULL,
	`type` text NOT NULL,
	`label` text NOT NULL,
	`description` text NOT NULL,
	`icon_encoded_data` text,
	`system_from_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_from / 1000.0, 'unixepoch')) VIRTUAL,
	`system_to_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_to / 1000.0, 'unixepoch')) VIRTUAL,
	PRIMARY KEY(`name`, `mod_pack_name`, `system_to`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `factorio_item_system_from_idx` ON `factorio_item` (`name`,`mod_pack_name`,`system_from`);--> statement-breakpoint
CREATE INDEX `factorio_item_idx_blueprint_game_data_entity` ON `factorio_item` (`name`,`system_to`);--> statement-breakpoint
CREATE INDEX `factorio_item_idx_mod_pack` ON `factorio_item` (`mod_pack_name`,`system_to`);--> statement-breakpoint
CREATE INDEX `factorio_item_idx_system_to_from` ON `factorio_item` (`system_to`,`system_from`);--> statement-breakpoint
CREATE TABLE `firebase_user` (
	`user_id` text NOT NULL,
	`system_from` integer NOT NULL,
	`system_to` integer DEFAULT 253402300799999 NOT NULL,
	`display_name` text NOT NULL,
	`provider_display_name` text,
	`email` text,
	`email_verified` integer NOT NULL,
	`photo_u_r_l` text,
	`provider_id` text,
	`system_from_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_from / 1000.0, 'unixepoch')) VIRTUAL,
	`system_to_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_to / 1000.0, 'unixepoch')) VIRTUAL,
	PRIMARY KEY(`user_id`, `system_to`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `firebase_user_system_from_idx` ON `firebase_user` (`user_id`,`system_from`);--> statement-breakpoint
CREATE INDEX `firebase_user_idx_system_to_from` ON `firebase_user` (`system_to`,`system_from`);--> statement-breakpoint
CREATE TABLE `firebase_user_version` (
	`user_id` text NOT NULL,
	`system_from` integer NOT NULL,
	`system_to` integer DEFAULT 253402300799999 NOT NULL,
	`number` integer NOT NULL,
	`system_from_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_from / 1000.0, 'unixepoch')) VIRTUAL,
	`system_to_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_to / 1000.0, 'unixepoch')) VIRTUAL,
	PRIMARY KEY(`user_id`, `system_to`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `firebase_user_version_system_from_idx` ON `firebase_user_version` (`user_id`,`system_from`);--> statement-breakpoint
CREATE INDEX `firebase_user_version_idx_system_to_from` ON `firebase_user_version` (`system_to`,`system_from`);--> statement-breakpoint
CREATE TABLE `imgur_image` (
	`imgur_id` text NOT NULL,
	`system_from` integer NOT NULL,
	`system_to` integer DEFAULT 253402300799999 NOT NULL,
	`imgur_type` text NOT NULL,
	`delete_hash` text,
	`height` integer NOT NULL,
	`width` integer NOT NULL,
	`system_from_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_from / 1000.0, 'unixepoch')) VIRTUAL,
	`system_to_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_to / 1000.0, 'unixepoch')) VIRTUAL,
	PRIMARY KEY(`imgur_id`, `system_to`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `imgur_image_system_from_idx` ON `imgur_image` (`imgur_id`,`system_from`);--> statement-breakpoint
CREATE INDEX `imgur_image_idx_system_to_from` ON `imgur_image` (`system_to`,`system_from`);--> statement-breakpoint
CREATE TABLE `mod_pack` (
	`name` text NOT NULL,
	`system_from` integer NOT NULL,
	`system_to` integer DEFAULT 253402300799999 NOT NULL,
	`description` text NOT NULL,
	`system_from_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_from / 1000.0, 'unixepoch')) VIRTUAL,
	`system_to_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_to / 1000.0, 'unixepoch')) VIRTUAL,
	PRIMARY KEY(`name`, `system_to`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mod_pack_system_from_idx` ON `mod_pack` (`name`,`system_from`);--> statement-breakpoint
CREATE INDEX `mod_pack_idx_system_to_from` ON `mod_pack` (`system_to`,`system_from`);--> statement-breakpoint
CREATE TABLE `recipe_mod_mapping` (
	`recipe_name` text NOT NULL,
	`mod` text NOT NULL,
	`system_from` integer NOT NULL,
	`system_to` integer DEFAULT 253402300799999 NOT NULL,
	`system_from_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_from / 1000.0, 'unixepoch')) VIRTUAL,
	`system_to_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_to / 1000.0, 'unixepoch')) VIRTUAL,
	PRIMARY KEY(`recipe_name`, `mod`, `system_to`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `recipe_mod_mapping_system_from_idx` ON `recipe_mod_mapping` (`recipe_name`,`mod`,`system_from`);--> statement-breakpoint
CREATE INDEX `recipe_mod_mapping_idx_recipe` ON `recipe_mod_mapping` (`recipe_name`,`system_to`);--> statement-breakpoint
CREATE INDEX `recipe_mod_mapping_idx_system_to_from` ON `recipe_mod_mapping` (`system_to`,`system_from`);--> statement-breakpoint
CREATE TABLE `tag` (
	`category` text NOT NULL,
	`name` text NOT NULL,
	`system_from` integer NOT NULL,
	`system_to` integer DEFAULT 253402300799999 NOT NULL,
	`ordinal` integer NOT NULL,
	`system_from_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_from / 1000.0, 'unixepoch')) VIRTUAL,
	`system_to_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_to / 1000.0, 'unixepoch')) VIRTUAL,
	PRIMARY KEY(`category`, `name`, `system_to`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tag_system_from_idx` ON `tag` (`category`,`name`,`system_from`);--> statement-breakpoint
CREATE INDEX `tag_idx_system_to_from` ON `tag` (`system_to`,`system_from`);--> statement-breakpoint
CREATE TABLE `user_entitlement` (
	`user_id` text NOT NULL,
	`user_role` text NOT NULL,
	`system_from` integer NOT NULL,
	`system_to` integer DEFAULT 253402300799999 NOT NULL,
	`system_from_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_from / 1000.0, 'unixepoch')) VIRTUAL,
	`system_to_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_to / 1000.0, 'unixepoch')) VIRTUAL,
	PRIMARY KEY(`user_id`, `user_role`, `system_to`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_entitlement_system_from_idx` ON `user_entitlement` (`user_id`,`user_role`,`system_from`);--> statement-breakpoint
CREATE INDEX `user_entitlement_idx_firebase_user` ON `user_entitlement` (`user_id`,`system_to`);--> statement-breakpoint
CREATE INDEX `user_entitlement_idx_system_to_from` ON `user_entitlement` (`system_to`,`system_from`);--> statement-breakpoint
CREATE TABLE `vote` (
	`user_id` text NOT NULL,
	`blueprint_key` text NOT NULL,
	`system_from` integer NOT NULL,
	`system_to` integer DEFAULT 253402300799999 NOT NULL,
	`direction` text NOT NULL,
	`system_from_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_from / 1000.0, 'unixepoch')) VIRTUAL,
	`system_to_text` text GENERATED ALWAYS AS (strftime('%Y-%m-%d %H:%M:%f', system_to / 1000.0, 'unixepoch')) VIRTUAL,
	PRIMARY KEY(`user_id`, `blueprint_key`, `system_to`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vote_system_from_idx` ON `vote` (`user_id`,`blueprint_key`,`system_from`);--> statement-breakpoint
CREATE INDEX `vote_idx_firebase_user` ON `vote` (`user_id`,`system_to`);--> statement-breakpoint
CREATE INDEX `vote_idx_blueprint` ON `vote` (`blueprint_key`,`system_to`);--> statement-breakpoint
CREATE INDEX `vote_idx_system_to_from` ON `vote` (`system_to`,`system_from`);
