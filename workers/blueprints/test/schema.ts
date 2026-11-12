import {integer, sqliteTable, text} from "drizzle-orm/sqlite-core";
import {systemTimeColumns, systemTimeConstraints} from "../src/temporal/columns.ts";

/** A versioned composite root, like `blueprint`. */
export const item = sqliteTable(
	"item",
	{
		key: text("key").notNull(),
		title: text("title").notNull(),
		description: text("description"),
		...systemTimeColumns(),
	},
	(table) => systemTimeConstraints("item", [table.key], table.systemFrom, table.systemTo),
);

/** A child list owned by `item`, like `blueprint_tag` with a value column. */
export const itemPart = sqliteTable(
	"item_part",
	{
		itemKey: text("item_key").notNull(),
		position: integer("position").notNull(),
		count: integer("count").notNull(),
		...systemTimeColumns(),
	},
	(table) => systemTimeConstraints("item_part", [table.itemKey, table.position], table.systemFrom, table.systemTo),
);

/** The version table of the `item` composite, like `blueprint_version`. */
export const itemVersion = sqliteTable(
	"item_version",
	{
		key: text("key").notNull(),
		number: integer("number").notNull(),
		...systemTimeColumns(),
	},
	(table) => systemTimeConstraints("item_version", [table.key], table.systemFrom, table.systemTo),
);

/** A content-addressed table, like `blueprint_string`: immutable, no system columns. */
export const content = sqliteTable(
	"content",
	{
		sha: text("sha").primaryKey(),
		createdById: text("created_by_id").notNull(),
		byteLength: integer("byte_length").notNull(),
	},
);
