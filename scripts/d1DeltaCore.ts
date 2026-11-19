/**
 * Pure helpers for bringing a remote D1 database from one local SQLite state to another: the rows that differ
 * become SQL statements, so only the difference is written remotely. The runner in deltaD1.ts does the file,
 * database and wrangler IO.
 */

import type {DatabaseSync} from "node:sqlite";
import {buildLoadStatements} from "./d1LoadCore.ts";
import type {SqlValue} from "./historyImportCore.ts";

// D1 rejects a SQL statement over 100 KB.
const D1_STATEMENT_BYTE_BUDGET = 90_000;
// Sums of integer columns are taken modulo a prime per value, so a total stays exactly representable in JavaScript.
const CHECKSUM_MODULUS = 1000003;

export interface DeltaTable
{
	name: string;
	/** The writable columns, generated ones left out. */
	columns: string[];
	/** The primary key, or every column for a table without one. */
	keyColumns: string[];
	integerColumns: string[];
}

export interface TableDelta
{
	deleted: number;
	inserted: number;
	statements: string[];
}

const quoteIdentifier = (name: string): string => `"${name.replaceAll('"', '""')}"`;

const sqlLiteral = (value: SqlValue): string =>
{
	if (value === null)
	{
		return "NULL";
	}
	return typeof value === "number" ? String(value) : `'${value.replaceAll("'", "''")}'`;
};

const arrays = (database: DatabaseSync, sql: string): SqlValue[][] =>
{
	const statement = database.prepare(sql);
	statement.setReturnArrays(true);
	return statement.all() as unknown as SqlValue[][];
};

/**
 * The statements that turn a table's rows in the attached `beforeSchema` into its rows in the main database. A row
 * that differs in any column is deleted by its key and inserted again, so a change of key, as when a version is
 * phased out or re-timed, needs no special case. Every delete comes before the first insert, which keeps unique
 * indexes satisfied throughout. Running the statements again changes nothing.
 */
export const buildTableDelta = (
	database: DatabaseSync,
	beforeSchema: string,
	table: DeltaTable,
	byteBudget: number = D1_STATEMENT_BYTE_BUDGET,
): TableDelta =>
{
	const name = quoteIdentifier(table.name);
	const columns = table.columns.map(quoteIdentifier).join(", ");
	const before = `SELECT ${columns} FROM ${quoteIdentifier(beforeSchema)}.${name}`;
	const after = `SELECT ${columns} FROM main.${name}`;
	const keyIndexes = table.keyColumns.map((column) => table.columns.indexOf(column));

	const stale = arrays(database, `${before} EXCEPT ${after}`);
	const fresh = arrays(database, `${after} EXCEPT ${before}`);

	const statements: string[] = [];
	const head = `DELETE FROM ${name} WHERE (${table.keyColumns.map(quoteIdentifier).join(", ")}) IN (VALUES `;
	let tuples: string[] = [];
	let bytes = Buffer.byteLength(head) + 2;
	const flush = (): void =>
	{
		if (tuples.length > 0)
		{
			statements.push(`${head}${tuples.join(", ")});`);
		}
		tuples = [];
		bytes = Buffer.byteLength(head) + 2;
	};
	for (const row of stale)
	{
		const tuple = `(${keyIndexes.map((index) => sqlLiteral(row[index])).join(", ")})`;
		const tupleBytes = Buffer.byteLength(tuple) + 2;
		if (tuples.length > 0 && bytes + tupleBytes > byteBudget)
		{
			flush();
		}
		tuples.push(tuple);
		bytes += tupleBytes;
	}
	flush();
	statements.push(...buildLoadStatements(table.name, table.columns, table.keyColumns, fresh, byteBudget));
	return {
		deleted: stale.length,
		inserted: fresh.length,
		statements,
	};
};

/**
 * One row per table: its row count, the total length of every value, and a checksum of its integer columns. Run
 * against the local database and the remote one, equal results show the remote matches. The integer checksum is
 * what notices a timestamp that changed without changing length.
 */
export const checksumQuery = (tables: readonly DeltaTable[]): string =>
	tables
		.map((table) =>
		{
			const lengths = table.columns
				.map((column) => `coalesce(length(${quoteIdentifier(column)}), 0)`)
				.join(" + ");
			const numbers =
				table.integerColumns
					.map((column) => `coalesce(${quoteIdentifier(column)} % ${CHECKSUM_MODULUS}, 0)`)
					.join(" + ") || "0";
			return (
				`SELECT ${sqlLiteral(table.name)} AS name, count(*) AS rows, coalesce(sum(${lengths}), 0) AS characters, ` +
				`coalesce(sum(${numbers}), 0) AS numbers FROM ${quoteIdentifier(table.name)}`
			);
		})
		.join(" UNION ALL ");
