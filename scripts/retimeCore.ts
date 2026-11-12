/**
 * SQL that re-times versions imported from history. History stamps a version with the instant of the backup that
 * first showed it, up to a day after the save that made it; the Realtime Database's lastUpdatedDate is that save.
 * The runner in retimeHistory.ts does the file, database and wrangler IO.
 */

const SYSTEM_TO_SENTINEL = 253402300799999;
// D1 rejects a SQL statement over 100 KB.
const D1_STATEMENT_BYTE_BUDGET = 90_000;

const DATES = "_blueprint_last_updated";
const RETIME = "_blueprint_retime";
// The tables of the blueprint composite, each with the column that holds the blueprint key.
const COMPOSITE_TABLES: readonly (readonly [table: string, keyColumn: string])[] = [
	["blueprint", "key"],
	["blueprint_version", "key"],
	["blueprint_private_data", "key"],
	["blueprint_tag", "blueprint_key"],
];

const quoteLiteral = (text: string): string => `'${text.replaceAll("'", "''")}'`;

/** Statements that (re)build the helper table of each blueprint's lastUpdatedDate, each within the byte budget. */
export const buildDateTableStatements = (
	rows: readonly (readonly [key: string, lastUpdatedDate: number])[],
	byteBudget: number = D1_STATEMENT_BYTE_BUDGET,
): string[] =>
{
	const head = `INSERT INTO ${DATES} (key, last_updated_date) VALUES `;
	const statements = [
		`DROP TABLE IF EXISTS ${DATES};`,
		`CREATE TABLE ${DATES} (key TEXT PRIMARY KEY NOT NULL, last_updated_date INTEGER NOT NULL);`,
	];
	let tuples: string[] = [];
	let bytes = head.length + 1;
	const flush = (): void =>
	{
		if (tuples.length > 0)
		{
			statements.push(`${head}${tuples.join(", ")};`);
		}
		tuples = [];
		bytes = head.length + 1;
	};
	for (const [key, date] of rows)
	{
		if (!Number.isSafeInteger(date))
		{
			throw new Error(`Blueprint ${key} has a lastUpdatedDate that is not an integer: ${date}`);
		}
		const tuple = `(${quoteLiteral(key)}, ${date})`;
		const tupleBytes = Buffer.byteLength(tuple) + 2;
		if (tuples.length > 0 && bytes + tupleBytes > byteBudget)
		{
			flush();
		}
		tuples.push(tuple);
		bytes += tupleBytes;
	}
	flush();
	return statements;
};

/**
 * A blueprint's current version can move back to `new_from` only if nothing else in its composite happened in
 * between: no row starts at or after the new time and before the old one (that includes the version it replaced,
 * which must stay earlier), and no row ends strictly between them.
 */
const nothingBetween = COMPOSITE_TABLES.map(
	([table, keyColumn]) =>
		`NOT EXISTS (SELECT 1 FROM ${table} t WHERE t.${keyColumn} = v.key AND (` +
		"(t.system_from >= d.last_updated_date AND t.system_from < v.system_from) " +
		"OR (t.system_to > d.last_updated_date AND t.system_to < v.system_from)))",
).join(" AND ");

/**
 * Moves each current blueprint version whose lastUpdatedDate is earlier than its system time back to that date:
 * every composite row that began with the version now begins at the date, and every row it replaced now ends
 * there. A version that cannot move without breaking the order of versions is listed as not eligible and left
 * alone. Running the statements again moves nothing further. They need the date table built first.
 */
export const RETIME_STATEMENTS: readonly string[] = [
	`DROP TABLE IF EXISTS ${RETIME};`,
	`CREATE TABLE ${RETIME} AS SELECT v.key AS key, v.system_from AS old_from, d.last_updated_date AS new_from, ` +
		`(${nothingBetween}) AS eligible ` +
		`FROM blueprint_version v JOIN ${DATES} d ON d.key = v.key ` +
		`WHERE v.system_to = ${SYSTEM_TO_SENTINEL} AND d.last_updated_date < v.system_from;`,
	...COMPOSITE_TABLES.flatMap(([table, keyColumn]) =>
		["system_from", "system_to"].map(
			(column) =>
				`UPDATE ${table} SET ${column} = r.new_from FROM ${RETIME} r ` +
				`WHERE r.eligible = 1 AND ${table}.${keyColumn} = r.key AND ${table}.${column} = r.old_from;`,
		),
	),
];

/**
 * What the last run found: current blueprints the dump dates, those dated earlier than their version, and how many
 * of those moved or were skipped.
 */
export const RETIME_REPORT_QUERY =
	`SELECT (SELECT count(*) FROM blueprint_version v JOIN ${DATES} d ON d.key = v.key ` +
	`WHERE v.system_to = ${SYSTEM_TO_SENTINEL}) AS dated, ` +
	`(SELECT count(*) FROM ${RETIME}) AS earlier, ` +
	`(SELECT count(*) FROM ${RETIME} WHERE eligible = 1) AS retimed, ` +
	`(SELECT count(*) FROM ${RETIME} WHERE eligible = 0) AS skipped`;
