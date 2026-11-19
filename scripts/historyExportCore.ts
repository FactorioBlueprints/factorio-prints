/**
 * Generates the SQL that exports factorio.school's history to one CSV per table, in the form importHistory.ts reads.
 * The runner in exportHistory.ts does the process and file IO.
 */

export interface HistoryColumn
{
	table: string;
	column: string;
	dataType: string;
}

/** Lists every column of the model's tables, in table and ordinal order. */
export const COLUMNS_QUERY =
	"SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS " +
	"WHERE TABLE_SCHEMA = 'PUBLIC' ORDER BY TABLE_NAME, ORDINAL_POSITION";

// Bookkeeping tables that are not part of the model.
const BOOKKEEPING_TABLES = new Set(["DATABASECHANGELOG", "DATABASECHANGELOGLOCK", "OBJECT_SEQUENCE"]);

// The string content is 4 GB, so it is exported apart from the rows that describe it.
const CONTENT_TABLE = "BLUEPRINT_STRING";
const CONTENT_COLUMN = "BLUEPRINT_STRING";
const CONTENT_KEY = "SHA";

// The history marks a still-current row with this SYSTEM_TO; D1 uses the last millisecond of the year 9999.
const LEGACY_INFINITY = "9999-12-01 23:59:00";
const D1_SENTINEL = 253402300799999;

const quoteIdentifier = (name: string): string => `"${name.replaceAll('"', '""')}"`;
const quoteLiteral = (text: string): string => `'${text.replaceAll("'", "''")}'`;

/** Timestamps hold UTC wall-clock time without a zone, so the distance from the epoch is the instant. */
const epochMilliseconds = (identifier: string): string =>
	`DATEDIFF(MILLISECOND, TIMESTAMP '1970-01-01 00:00:00', ${identifier})`;

const selectExpression = ({column, dataType}: HistoryColumn): string =>
{
	const identifier = quoteIdentifier(column);
	if (!dataType.startsWith("TIMESTAMP"))
	{
		return identifier;
	}
	if (column === "SYSTEM_TO")
	{
		return (
			`CASE WHEN ${identifier} = TIMESTAMP '${LEGACY_INFINITY}' THEN ${D1_SENTINEL} ` +
			`ELSE ${epochMilliseconds(identifier)} END AS ${identifier}`
		);
	}
	return `${epochMilliseconds(identifier)} AS ${identifier}`;
};

const csvWrite = (outputDirectory: string, fileName: string, table: string, expressions: string[]): string =>
{
	const query = `SELECT ${expressions.join(", ")} FROM ${quoteIdentifier(table)}`;
	return `CALL CSVWRITE(${quoteLiteral(`${outputDirectory}/${fileName}.csv`)}, ${quoteLiteral(query)}, 'charset=UTF-8');`;
};

/** One CSVWRITE per table, plus a second file holding only the blueprint string content. */
export const buildExportStatements = (columns: HistoryColumn[], outputDirectory: string): string[] =>
{
	if (outputDirectory.includes("'"))
	{
		throw new Error(`Output directory must not contain a quote: ${outputDirectory}`);
	}
	const tables = new Map<string, HistoryColumn[]>();
	for (const column of columns)
	{
		if (BOOKKEEPING_TABLES.has(column.table))
		{
			continue;
		}
		tables.set(column.table, [...(tables.get(column.table) ?? []), column]);
	}

	const statements: string[] = [];
	for (const [table, tableColumns] of tables)
	{
		if (table !== CONTENT_TABLE)
		{
			statements.push(csvWrite(outputDirectory, table, table, tableColumns.map(selectExpression)));
			continue;
		}
		statements.push(
			csvWrite(
				outputDirectory,
				table,
				table,
				tableColumns.filter(({column}) => column !== CONTENT_COLUMN).map(selectExpression),
			),
			csvWrite(outputDirectory, `${table}_CONTENT`, table, [
				quoteIdentifier(CONTENT_KEY),
				quoteIdentifier(CONTENT_COLUMN),
			]),
		);
	}
	return statements;
};
