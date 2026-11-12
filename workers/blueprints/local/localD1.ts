import type {DatabaseSync, SQLInputValue, StatementSync} from "node:sqlite";

// The slice of the D1 client API that drizzle's D1 driver calls, over a local SQLite database, so the Worker's own
// ingest and reconcile code can run against the database built by scripts/importHistory.ts. A batch is one transaction, as
// in D1: a statement that fails rolls back the whole batch.

interface LocalResult
{
	results: unknown[];
	success: true;
	meta:
	{
		changes: number;
	};
}

const toSqlite = (value: unknown): SQLInputValue =>
{
	if (typeof value === "boolean")
	{
		return value ? 1 : 0;
	}
	return (value ?? null) as SQLInputValue;
};

class LocalStatement
{
	private readonly statement: StatementSync;
	private readonly params: SQLInputValue[];

	constructor(statement: StatementSync, params: SQLInputValue[] = [])
	{
		this.statement = statement;
		this.params = params;
	}

	bind(...params: unknown[]): LocalStatement
	{
		return new LocalStatement(this.statement, params.map(toSqlite));
	}

	execute(asArrays: boolean): LocalResult
	{
		if (this.statement.columns().length === 0)
		{
			const {changes} = this.statement.run(...this.params);
			return {
				results: [],
				success: true,
				meta:
				{
					changes: Number(changes),
				},
			};
		}
		this.statement.setReturnArrays(asArrays);
		const rows = this.statement.all(...this.params) as unknown[];
		return {
			// node:sqlite rows have no prototype, which strict equality checks would trip over.
			results: asArrays
				? rows
				: rows.map((row) => (
					{
						...(row as object),
					})),
			success: true,
			meta:
			{
				changes: 0,
			},
		};
	}

	async all(): Promise<LocalResult>
	{
		return this.execute(false);
	}

	async run(): Promise<LocalResult>
	{
		return this.execute(false);
	}

	async raw(): Promise<unknown[]>
	{
		return this.execute(true).results;
	}
}

export const localD1 = (database: DatabaseSync) => (
{
	prepare: (sql: string) => new LocalStatement(database.prepare(sql)),
	batch: async (statements: LocalStatement[]): Promise<LocalResult[]> =>
	{
		database.exec("BEGIN");
		try
		{
			const results = statements.map((statement) => statement.execute(false));
			database.exec("COMMIT");
			return results;
		}
		catch (error)
		{
			database.exec("ROLLBACK");
			throw error;
		}
	},
});
