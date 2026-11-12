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

const CUTS = "_blueprint_version_cut";
const SEGMENTS = "_blueprint_version_segment";
// The parts of a blueprint whose change is an edit of the blueprint, apart from its own row.
const VERSIONED_PARTS: readonly (readonly [table: string, keyColumn: string])[] = [
	["blueprint_tag", "blueprint_key"],
	["blueprint_private_data", "key"],
];

const changeTimes = VERSIONED_PARTS.flatMap(([table, keyColumn]) =>
	["system_from", "system_to"].map((column) => `SELECT ${keyColumn} AS key, ${column} AS time FROM ${table}`),
).join(" UNION ");

/**
 * History starts a version only when the blueprint's own row changes, so an edit that changed nothing but its tags
 * or private data has none, and the blueprint's last version looks older than its last edit. These statements
 * start a version at every such change that falls inside an existing version: that version ends there, a new one
 * with the same author and created date runs to where the old one ended, and the blueprint's versions are numbered
 * again in order (which also gives a blueprint that was deleted and created again one sequence of numbers). A
 * change at a version's own start or end needs nothing. Running the statements again changes nothing.
 */
export const VERSION_CUT_STATEMENTS: readonly string[] = [
	`DROP TABLE IF EXISTS ${CUTS};`,
	`CREATE TABLE ${CUTS} AS SELECT DISTINCT v.key AS key, c.time AS cut_time ` +
		`FROM (${changeTimes}) c JOIN blueprint_version v ` +
		"ON v.key = c.key AND v.system_from < c.time AND c.time < v.system_to;",
	`DROP TABLE IF EXISTS ${SEGMENTS};`,
	`CREATE TABLE ${SEGMENTS} AS SELECT v.key AS key, c.cut_time AS system_from, ` +
		`coalesce((SELECT min(n.cut_time) FROM ${CUTS} n WHERE n.key = v.key AND n.cut_time > c.cut_time ` +
		"AND n.cut_time < v.system_to), v.system_to) AS system_to, " +
		"v.created_by_id AS created_by_id, v.created_on AS created_on, v.last_updated_by_id AS last_updated_by_id " +
		`FROM ${CUTS} c JOIN blueprint_version v ` +
		"ON v.key = c.key AND v.system_from < c.cut_time AND c.cut_time < v.system_to;",
	`UPDATE blueprint_version SET system_to = (SELECT min(c.cut_time) FROM ${CUTS} c ` +
		"WHERE c.key = blueprint_version.key AND c.cut_time > blueprint_version.system_from " +
		"AND c.cut_time < blueprint_version.system_to) " +
		`WHERE EXISTS (SELECT 1 FROM ${CUTS} c WHERE c.key = blueprint_version.key ` +
		"AND c.cut_time > blueprint_version.system_from AND c.cut_time < blueprint_version.system_to);",
	"INSERT INTO blueprint_version (key, system_from, system_to, created_by_id, created_on, last_updated_by_id, number) " +
		`SELECT key, system_from, system_to, created_by_id, created_on, last_updated_by_id, 0 FROM ${SEGMENTS};`,
	"UPDATE blueprint_version SET number = r.number FROM " +
		"(SELECT key, system_from, row_number() OVER (PARTITION BY key ORDER BY system_from) AS number " +
		"FROM blueprint_version) r " +
		"WHERE r.key = blueprint_version.key AND r.system_from = blueprint_version.system_from " +
		"AND blueprint_version.number <> r.number;",
];

/** What the last run cut: the versions started, and the blueprints they belong to. */
export const VERSION_CUT_REPORT_QUERY = `SELECT count(*) AS cuts, count(DISTINCT key) AS blueprints FROM ${CUTS}`;
