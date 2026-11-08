import {sql} from "drizzle-orm";
import {integer, primaryKey, type SQLiteColumn, text, uniqueIndex} from "drizzle-orm/sqlite-core";

/** `system_to` of a row that is still current: 9999-12-31 23:59:59.999 UTC in epoch milliseconds. */
export const SYSTEM_TO_SENTINEL = 253402300799999;

const epochMillisecondsAsText = (column: string) =>
	sql.raw(`strftime('%Y-%m-%d %H:%M:%f', ${column} / 1000.0, 'unixepoch')`);

/** The system-time columns every temporal table ends with. The `_text` columns are generated and never written. */
export const systemTimeColumns = () => (
{
	systemFrom: integer("system_from").notNull(),
	systemTo: integer("system_to").notNull().default(SYSTEM_TO_SENTINEL),
	systemFromText: text("system_from_text").generatedAlwaysAs(
		epochMillisecondsAsText("system_from"),
		{
			mode: "virtual",
		},
	),
	systemToText: text("system_to_text").generatedAlwaysAs(
		epochMillisecondsAsText("system_to"),
		{
			mode: "virtual",
		},
	),
});

/** Primary key `(business key..., system_to)` and unique index `(business key..., system_from)`. */
export const systemTimeConstraints = (
	tableName: string,
	businessKey: [SQLiteColumn, ...SQLiteColumn[]],
	systemFrom: SQLiteColumn,
	systemTo: SQLiteColumn,
) => [
	primaryKey(
		{
			columns: [...businessKey, systemTo],
		},
	),
	uniqueIndex(`${tableName}_system_from_idx`).on(...businessKey, systemFrom),
];
