/**
 * Pure helpers for loading the locally imported SQLite database into a remote D1 database as SQL files.
 * The runner in loadD1.ts does the file, database and wrangler IO.
 */

import type {SqlValue} from "./historyImportCore.ts";

// D1 rejects a SQL statement over 100 KB.
const D1_STATEMENT_BYTE_BUDGET = 90_000;

const quoteIdentifier = (name: string): string => `"${name.replaceAll('"', '""')}"`;

const sqlLiteral = (value: SqlValue): string =>
{
	if (value === null)
	{
		return "NULL";
	}
	return typeof value === "number" ? String(value) : `'${value.replaceAll("'", "''")}'`;
};

const isHighSurrogate = (codeUnit: number): boolean => codeUnit >= 0xd800 && codeUnit <= 0xdbff;

/** Splits text into pieces of about `size` UTF-16 units without separating a surrogate pair. */
const pieces = (text: string, size: number): string[] =>
{
	const result: string[] = [];
	let start = 0;
	while (start < text.length)
	{
		let end = Math.min(start + size, text.length);
		if (end < text.length && isHighSurrogate(text.charCodeAt(end - 1)))
		{
			end++;
		}
		result.push(text.slice(start, end));
		start = end;
	}
	return result;
};

const codePoints = (text: string): number =>
{
	let count = 0;
	for (const _ of text)
	{
		count++;
	}
	return count;
};

/**
 * SQL statements that load rows into a table, each within the byte budget. Rows are packed into multi-row
 * `INSERT OR IGNORE`s. A value too large for one statement is inserted empty and then appended piece by piece, each
 * append guarded by the length so far. Every statement can therefore be run again without changing anything, which
 * is what makes an interrupted load resumable.
 */
export const buildLoadStatements = (
	table: string,
	columns: string[],
	keyColumns: string[],
	rows: SqlValue[][],
	byteBudget: number = D1_STATEMENT_BYTE_BUDGET,
): string[] =>
{
	const head = `INSERT OR IGNORE INTO ${quoteIdentifier(table)} (${columns.map(quoteIdentifier).join(", ")}) VALUES `;
	const headBytes = Buffer.byteLength(head);
	// A UTF-16 unit is at most three UTF-8 bytes, so a piece is at most three quarters of the budget.
	const pieceSize = Math.floor(byteBudget / 4);
	const statementBytes = (tuple: string): number => headBytes + Buffer.byteLength(tuple) + 1;

	const statements: string[] = [];
	let tuples: string[] = [];
	let bytes = headBytes + 1;
	const flush = (): void =>
	{
		if (tuples.length > 0)
		{
			statements.push(`${head}${tuples.join(", ")};`);
		}
		tuples = [];
		bytes = headBytes + 1;
	};

	for (const row of rows)
	{
		const tupleOf = (values: SqlValue[]): string => `(${values.map(sqlLiteral).join(", ")})`;
		let tuple = tupleOf(row);
		const appends: string[] = [];
		if (statementBytes(tuple) > byteBudget)
		{
			const keyPredicate = keyColumns
				.map((key) => `${quoteIdentifier(key)} = ${sqlLiteral(row[columns.indexOf(key)])}`)
				.join(" AND ");
			const inserted = row.map((value, index) =>
			{
				if (typeof value !== "string" || value.length <= pieceSize || keyColumns.includes(columns[index]))
				{
					return value;
				}
				const column = quoteIdentifier(columns[index]);
				let lengthSoFar = 0;
				for (const piece of pieces(value, pieceSize))
				{
					appends.push(
						`UPDATE ${quoteIdentifier(table)} SET ${column} = ${column} || ${sqlLiteral(piece)} ` +
							`WHERE ${keyPredicate} AND length(${column}) = ${lengthSoFar};`,
					);
					lengthSoFar += codePoints(piece);
				}
				return "";
			});
			tuple = tupleOf(inserted);
			const largest = Math.max(statementBytes(tuple), ...appends.map((append) => Buffer.byteLength(append)));
			if (largest > byteBudget)
			{
				throw new Error(
					`A row of ${table} needs a ${largest}-byte statement, over the ${byteBudget}-byte budget`,
				);
			}
		}

		const tupleBytes = Buffer.byteLength(tuple) + 2;
		if (tuples.length > 0 && (bytes + tupleBytes > byteBudget || appends.length > 0))
		{
			flush();
		}
		tuples.push(tuple);
		bytes += tupleBytes;
		if (appends.length > 0)
		{
			flush();
			statements.push(...appends);
		}
	}
	flush();
	return statements;
};

/** D1 bills a row written for the table row and one more for each index entry. */
export const rowsWrittenEstimate = (
	tables:
	{
		rows: number;
		indexes: number;
	}[],
): number => tables.reduce((total, {rows, indexes}) => total + rows * (1 + indexes), 0);

/**
 * One row per table: its row count and the total length of every value. Run against the local database and the
 * remote one, equal results show the load is complete, including values that were appended in pieces.
 */
export const fingerprintQuery = (
	tables:
	{
		name: string;
		columns: string[];
	}[],
): string =>
	tables
		.map(({name, columns}) =>
		{
			const lengths = columns.map((column) => `coalesce(length(${quoteIdentifier(column)}), 0)`).join(" + ");
			return (
				`SELECT ${sqlLiteral(name)} AS name, count(*) AS rows, coalesce(sum(${lengths}), 0) AS characters ` +
				`FROM ${quoteIdentifier(name)}`
			);
		})
		.join(" UNION ALL ");
