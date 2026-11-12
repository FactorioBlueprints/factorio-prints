/**
 * Pure helpers for importing factorio.school's history database (exported with CSVWRITE) into D1.
 * The runner in importHistory.ts does the file and database IO.
 */

import {createHash} from "node:crypto";

export type CsvField = string | null;
export type SqlValue = string | number | null;
export type ColumnType = "INTEGER" | "TEXT" | "REAL";

export interface InsertBatch
{
	sql: string;
	params: SqlValue[];
}

// D1 allows 100 bound parameters per query and 100 KB per SQL statement.
const D1_MAX_PARAMETERS = 100;
const D1_STATEMENT_BYTE_BUDGET = 90_000;

/**
 * Streaming parser for CSVWRITE output: every string is quoted (with "" for a literal quote), and NULL is an
 * unquoted empty field. Fields may contain newlines, and a chunk may end anywhere.
 */
export class CsvRowParser
{
	private field = "";
	private row: CsvField[] = [];
	private inQuotes = false;
	private quoted = false;
	private pendingQuote = false;
	private fieldStarted = false;

	push(chunk: string): CsvField[][]
	{
		const rows: CsvField[][] = [];
		for (const character of chunk)
		{
			if (this.inQuotes)
			{
				if (this.pendingQuote)
				{
					this.pendingQuote = false;
					if (character === '"')
					{
						this.field += '"';
						continue;
					}
					this.inQuotes = false;
					// Fall through: the quote closed the field, so handle this character as a delimiter.
				}
				else if (character === '"')
				{
					this.pendingQuote = true;
					continue;
				}
				else
				{
					this.field += character;
					continue;
				}
			}

			if (character === '"' && !this.fieldStarted)
			{
				this.inQuotes = true;
				this.quoted = true;
				this.fieldStarted = true;
			}
			else if (character === ",")
			{
				this.endField();
			}
			else if (character === "\n")
			{
				rows.push(this.endRow());
			}
			else if (character === "\r")
			{
				// CRLF: the \n that follows ends the row.
			}
			else
			{
				this.field += character;
				this.fieldStarted = true;
			}
		}
		return rows;
	}

	end(): CsvField[][]
	{
		if (this.pendingQuote)
		{
			this.pendingQuote = false;
			this.inQuotes = false;
		}
		if (this.inQuotes)
		{
			throw new Error("CSV ended inside a quoted field");
		}
		if (this.fieldStarted || this.row.length > 0)
		{
			return [this.endRow()];
		}
		return [];
	}

	private endField(): void
	{
		this.row.push(this.quoted || this.field.length > 0 ? this.field : null);
		this.field = "";
		this.quoted = false;
		this.fieldStarted = false;
	}

	private endRow(): CsvField[]
	{
		this.endField();
		const row = this.row;
		this.row = [];
		return row;
	}
}

export const tableNameFor = (csvTableName: string): string => csvTableName.toLowerCase();

/** Lowercase hex SHA-256 of the UTF-8 bytes: the digest key of a blueprint string, in D1 and in R2. */
export const sha256Hex = (content: string): string => createHash("sha256").update(content, "utf8").digest("hex");

const isShaColumn = (column: string): boolean => column === "sha" || column.endsWith("_sha");

/**
 * The history still keys blueprint strings by SHA-1. Translates a row's string key or reference (any `sha` or `*_sha`
 * column, in every table and every history row) to the SHA-256 the string was re-keyed under.
 */
export const rekeyRow = (
	csvTable: string,
	columns: string[],
	row: CsvField[],
	sha256BySha1: ReadonlyMap<string, string>,
): CsvField[] =>
	row.map((value, index) =>
	{
		if (value === null || !isShaColumn(columns[index]))
		{
			return value;
		}
		const sha256 = sha256BySha1.get(value);
		if (sha256 === undefined)
		{
			throw new Error(`${csvTable}.${columns[index]} references ${value}, which has no blueprint string`);
		}
		return sha256;
	});

export const coerceValue = (value: CsvField, type: ColumnType): SqlValue =>
{
	if (value === null || type === "TEXT")
	{
		return value;
	}
	if (type === "INTEGER")
	{
		if (value === "TRUE")
		{
			return 1;
		}
		if (value === "FALSE")
		{
			return 0;
		}
		if (!/^-?\d+$/.test(value))
		{
			throw new Error(`${JSON.stringify(value)} is not an integer`);
		}
		const parsed = Number(value);
		if (!Number.isSafeInteger(parsed))
		{
			throw new Error(`${value} is not an integer that JavaScript can represent exactly`);
		}
		return parsed;
	}
	const parsed = Number(value);
	if (Number.isNaN(parsed))
	{
		throw new Error(`${JSON.stringify(value)} is not a number`);
	}
	return parsed;
};

const quoteIdentifier = (name: string): string => `"${name.replaceAll('"', '""')}"`;

const valueBytes = (value: SqlValue): number =>
	typeof value === "string" ? new TextEncoder().encode(value).length : 8;

/**
 * Packs rows into multi-row INSERT statements that stay within the bound-parameter limit and a byte budget, so a
 * row with large text values gets a statement of its own.
 */
export const buildInsertBatches = (
	table: string,
	columns: string[],
	rows: SqlValue[][],
	maxParameters: number = D1_MAX_PARAMETERS,
	byteBudget: number = D1_STATEMENT_BYTE_BUDGET,
): InsertBatch[] =>
{
	if (columns.length > maxParameters)
	{
		throw new Error(`Table ${table} has ${columns.length} columns, over the parameter limit of ${maxParameters}`);
	}
	const head = `INSERT INTO ${quoteIdentifier(table)} (${columns.map(quoteIdentifier).join(", ")}) VALUES `;
	const tuple = `(${columns.map(() => "?").join(", ")})`;
	const rowsPerStatement = Math.floor(maxParameters / columns.length);

	const batches: InsertBatch[] = [];
	let pending: SqlValue[][] = [];
	let pendingBytes = 0;

	const flush = (): void =>
	{
		if (pending.length === 0)
		{
			return;
		}
		batches.push(
			{
				sql: head + pending.map(() => tuple).join(", "),
				params: pending.flat(),
			},
		);
		pending = [];
		pendingBytes = 0;
	};

	for (const row of rows)
	{
		const bytes = row.reduce<number>((total, value) => total + valueBytes(value), 0);
		if (pending.length > 0 && (pending.length >= rowsPerStatement || pendingBytes + bytes > byteBudget))
		{
			flush();
		}
		pending.push(row);
		pendingBytes += bytes;
	}
	flush();
	return batches;
};
