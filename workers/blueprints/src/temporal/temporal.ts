import
{
	and,
	asc,
	desc,
	eq,
	getTableColumns,
	getTableName,
	gt,
	type InferInsertModel,
	type InferSelectModel,
	lte,
	sql,
	type SQL,
} from "drizzle-orm";
import type {BatchItem} from "drizzle-orm/batch";
import type {DrizzleD1Database} from "drizzle-orm/d1";
import type {SQLiteColumn, SQLiteTable} from "drizzle-orm/sqlite-core";
import {SYSTEM_TO_SENTINEL} from "./columns.ts";

// Every write in a unit of work is planned against the rows read when the operation is called, and all of them
// run in one D1 batch at commit, which D1 executes as a single transaction. D1 has no interactive transactions, so
// a concurrent unit of work can commit between the read and the batch. Two things catch that and roll the whole
// batch back: each phase-out matches only the exact row it compared against and is followed by an assertion that
// it closed one row, and the primary key (business key, system_to) rejects a second current row.

export type Database = DrizzleD1Database<any>;

type SystemColumnName = "systemFrom" | "systemTo";

type Row<TTable extends SQLiteTable> = InferSelectModel<TTable>;

/** A row to write: every insertable column except the system-time ones, which the unit of work stamps. */
export type TemporalValues<TTable extends SQLiteTable> = Omit<InferInsertModel<TTable>, SystemColumnName>;

export type Outcome = "inserted" | "updated" | "unchanged" | "phased-out" | "skipped-stale" | "conflict";

export interface RowChange
{
	table: string;
	key: Record<string, unknown>;
	outcome: Outcome;
}

export type CommitResult =
	|
	  {
			status: "committed";
			changes: RowChange[];
	  }
	|
	  {
			status: "conflict";
			changes: RowChange[];
	  };

export interface TemporalTable<TTable extends SQLiteTable, TKey extends keyof Row<TTable> & string>
{
	readonly kind: "temporal";
	readonly table: TTable;
	readonly name: string;
	readonly keyNames: readonly TKey[];
	readonly valueNames: readonly string[];
	readonly columns: Record<string, SQLiteColumn>;
}

export interface ContentAddressedTable<TTable extends SQLiteTable, TKey extends keyof Row<TTable> & string>
{
	readonly kind: "content-addressed";
	readonly table: TTable;
	readonly name: string;
	readonly keyNames: readonly TKey[];
	readonly columns: Record<string, SQLiteColumn>;
}

type AnyTable<TTable extends SQLiteTable, TKey extends keyof Row<TTable> & string> =
	| TemporalTable<TTable, TKey>
	| ContentAddressedTable<TTable, TKey>;

export type BusinessKey<TTable extends SQLiteTable, TKey extends keyof Row<TTable> & string> = Pick<Row<TTable>, TKey>;

export interface WriteOptions
{
	/** When the source event happened. A row that changed after it makes the write stale, and it is skipped. */
	eventTime?: number;
}

interface PlannedWrite
{
	change: RowChange;
	statements: BatchItem<"sqlite">[];
	/** Turns the batch results of `statements` into the final outcome, for writes whose effect is only known then. */
	settle?: (results: unknown[]) => Outcome;
}

export interface UnitOfWork
{
	readonly db: Database;
	readonly now: number;
	readonly planned: PlannedWrite[];
	readonly written: Set<string>;
	committed: boolean;
}

const columnsOf = (table: SQLiteTable) => getTableColumns(table) as Record<string, SQLiteColumn>;

export const temporalTable = <TTable extends SQLiteTable, TKey extends keyof Row<TTable> & string>(
	table: TTable,
	keyNames: readonly [TKey, ...TKey[]],
): TemporalTable<TTable, TKey> =>
{
	const columns = columnsOf(table);
	const name = getTableName(table);
	if (!columns.systemFrom || !columns.systemTo)
	{
		throw new Error(`${name} has no systemFrom and systemTo columns`);
	}
	const valueNames = Object.keys(columns).filter(
		(columnName) =>
			!(keyNames as readonly string[]).includes(columnName) &&
			columnName !== "systemFrom" &&
			columnName !== "systemTo" &&
			!columns[columnName].generated,
	);
	return {
		kind: "temporal",
		table,
		name,
		keyNames,
		valueNames,
		columns,
	};
};

export const contentAddressedTable = <TTable extends SQLiteTable, TKey extends keyof Row<TTable> & string>(
	table: TTable,
	keyNames: readonly [TKey, ...TKey[]],
): ContentAddressedTable<TTable, TKey> => (
{
	kind: "content-addressed",
	table,
	name: getTableName(table),
	keyNames,
	columns: columnsOf(table),
});

/** One logical change. Every row it writes is stamped with `now`, taken once by the caller. */
export const createUnitOfWork = (db: Database, now: number): UnitOfWork => (
{
	db,
	now,
	planned: [],
	written: new Set(),
	committed: false,
});

const keyOf = (target: AnyTable<any, any>, values: Record<string, unknown>) =>
	Object.fromEntries(target.keyNames.map((keyName) => [keyName, values[keyName]]));

const matchesKey = (target: AnyTable<any, any>, key: Record<string, unknown>): SQL =>
	and(...Object.entries(key).map(([columnName, value]) => eq(target.columns[columnName], value)))!;

const isCurrent = (target: TemporalTable<any, any>) => eq(target.columns.systemTo, SYSTEM_TO_SENTINEL);

const sameValue = (left: unknown, right: unknown): boolean =>
{
	const normalizedLeft = left ?? null;
	const normalizedRight = right ?? null;
	if (normalizedLeft instanceof Uint8Array && normalizedRight instanceof Uint8Array)
	{
		return (
			normalizedLeft.length === normalizedRight.length &&
			normalizedLeft.every((byte, index) => byte === normalizedRight[index])
		);
	}
	if (normalizedLeft instanceof Date && normalizedRight instanceof Date)
	{
		return normalizedLeft.getTime() === normalizedRight.getTime();
	}
	return Object.is(normalizedLeft, normalizedRight);
};

const sameValues = (
	target: TemporalTable<any, any>,
	current: Record<string, unknown>,
	incoming: Record<string, unknown>,
) => target.valueNames.every((valueName) => sameValue(current[valueName], incoming[valueName]));

/** The instant a row last changed: when it was phased out, or when it was phased in if it is still current. */
const lastChange = (row: Record<string, unknown>) =>
	(row.systemTo === SYSTEM_TO_SENTINEL ? row.systemFrom : row.systemTo) as number;

const isStale = (rows: Record<string, unknown>[], options: WriteOptions) =>
	options.eventTime !== undefined && rows.some((row) => lastChange(row) > options.eventTime!);

const claim = (unitOfWork: UnitOfWork, target: AnyTable<any, any>, key: Record<string, unknown>) =>
{
	if (unitOfWork.committed)
	{
		throw new Error("This unit of work is already committed");
	}
	const id = `${target.name} ${JSON.stringify(key)}`;
	if (unitOfWork.written.has(id))
	{
		throw new Error(`${id} is already written in this unit of work`);
	}
	unitOfWork.written.add(id);
};

const plan = (unitOfWork: UnitOfWork, write: PlannedWrite) =>
{
	unitOfWork.planned.push(write);
	return write.change;
};

/** Fails the batch unless the statement just before it changed exactly one row. */
const assertOneRowChanged = (db: Database) =>
	db.run(sql`SELECT json(CASE WHEN changes() = 1 THEN '1' ELSE 'temporal conflict: row changed concurrently' END)`);

const phaseOutStatements = (
	unitOfWork: UnitOfWork,
	target: TemporalTable<any, any>,
	current: Record<string, unknown>,
) =>
{
	const update = unitOfWork.db
		.update(target.table)
		.set(
			{
				systemTo: unitOfWork.now,
			},
		)
		.where(
			and(
				matchesKey(target, keyOf(target, current)),
				isCurrent(target),
				eq(target.columns.systemFrom, current.systemFrom),
			),
		);
	return [update, assertOneRowChanged(unitOfWork.db)];
};

const insertStatement = (unitOfWork: UnitOfWork, target: TemporalTable<any, any>, values: Record<string, unknown>) =>
{
	const row: Record<string, unknown> =
	{
		systemFrom: unitOfWork.now,
		systemTo: SYSTEM_TO_SENTINEL,
	};
	for (const columnName of [...target.keyNames, ...target.valueNames])
	{
		row[columnName] = values[columnName] ?? null;
	}
	return unitOfWork.db.insert(target.table).values(row);
};

/** Plans the write of one incoming row given the current row it replaces, if any. */
const planReplacement = (
	unitOfWork: UnitOfWork,
	target: TemporalTable<any, any>,
	current: Record<string, unknown> | undefined,
	values: Record<string, unknown>,
): RowChange =>
{
	const change = (outcome: Outcome): RowChange => (
	{
		table: target.name,
		key: keyOf(target, values),
		outcome,
	});
	if (current === undefined)
	{
		return plan(
			unitOfWork,
			{
				change: change("inserted"),
				statements: [insertStatement(unitOfWork, target, values)],
			},
		);
	}
	if (sameValues(target, current, values))
	{
		return plan(
			unitOfWork,
			{
				change: change("unchanged"),
				statements: [],
			},
		);
	}
	return plan(
		unitOfWork,
		{
			change: change("updated"),
			statements: [
				...phaseOutStatements(unitOfWork, target, current),
				insertStatement(unitOfWork, target, values),
			],
		},
	);
};

const selectRows = async <TTable extends SQLiteTable>(
	db: Database,
	target: AnyTable<TTable, any>,
	where: SQL,
	order: SQL[],
	limit?: number,
) =>
{
	const query = db
		.select()
		.from(target.table as SQLiteTable)
		.where(where)
		.orderBy(...order);
	return (await (limit === undefined ? query : query.limit(limit))) as Row<TTable>[];
};

const latestVersion = async <TTable extends SQLiteTable>(
	db: Database,
	target: TemporalTable<TTable, any>,
	key: Record<string, unknown>,
) =>
	(await selectRows(db, target, matchesKey(target, key), [desc(target.columns.systemTo)], 1))[0] as
		| Record<string, unknown>
		| undefined;

export const findCurrent = async <TTable extends SQLiteTable, TKey extends keyof Row<TTable> & string>(
	db: Database,
	target: TemporalTable<TTable, TKey>,
	key: BusinessKey<TTable, TKey>,
): Promise<Row<TTable> | undefined> =>
	(await selectRows(db, target, and(matchesKey(target, key), isCurrent(target))!, []))[0];

/** The row that was current at `instant`: `system_from <= instant AND system_to > instant`. */
export const findAsOf = async <TTable extends SQLiteTable, TKey extends keyof Row<TTable> & string>(
	db: Database,
	target: TemporalTable<TTable, TKey>,
	key: BusinessKey<TTable, TKey>,
	instant: number,
): Promise<Row<TTable> | undefined> =>
	(
		await selectRows(
			db,
			target,
			and(
				matchesKey(target, key),
				lte(target.columns.systemFrom, instant),
				gt(target.columns.systemTo, instant),
			)!,
			[],
		)
	)[0];

/** Every version of every row matching `key` (a full or partial business key), oldest first. */
export const history = async <TTable extends SQLiteTable, TKey extends keyof Row<TTable> & string>(
	db: Database,
	target: TemporalTable<TTable, TKey>,
	key: Partial<BusinessKey<TTable, TKey>>,
): Promise<Row<TTable>[]> =>
	selectRows(db, target, matchesKey(target, key), [
		...target.keyNames.map((keyName) => asc(target.columns[keyName])),
		asc(target.columns.systemFrom),
	]);

/** Phases in `values` unless they equal the current row (compare-before-cut). */
export const upsert = async <TTable extends SQLiteTable, TKey extends keyof Row<TTable> & string>(
	unitOfWork: UnitOfWork,
	target: TemporalTable<TTable, TKey>,
	values: TemporalValues<TTable>,
	options: WriteOptions = {},
): Promise<RowChange> =>
{
	const incoming = values as Record<string, unknown>;
	const key = keyOf(target, incoming);
	claim(unitOfWork, target, key);
	const latest = await latestVersion(unitOfWork.db, target, key);
	if (latest !== undefined && isStale([latest], options))
	{
		return plan(
			unitOfWork,
			{
				change:
				{
					table: target.name,
					key,
					outcome: "skipped-stale",
				},
				statements: [],
			},
		);
	}
	const current = latest?.systemTo === SYSTEM_TO_SENTINEL ? latest : undefined;
	return planReplacement(unitOfWork, target, current, incoming);
};

/** Non-destructive delete: closes the current row at `now`. */
export const phaseOut = async <TTable extends SQLiteTable, TKey extends keyof Row<TTable> & string>(
	unitOfWork: UnitOfWork,
	target: TemporalTable<TTable, TKey>,
	key: BusinessKey<TTable, TKey>,
	options: WriteOptions = {},
): Promise<RowChange> =>
{
	const businessKey = keyOf(target, key);
	claim(unitOfWork, target, businessKey);
	const latest = await latestVersion(unitOfWork.db, target, businessKey);
	const change = (outcome: Outcome): RowChange => (
	{
		table: target.name,
		key: businessKey,
		outcome,
	});
	if (latest !== undefined && isStale([latest], options))
	{
		return plan(
			unitOfWork,
			{
				change: change("skipped-stale"),
				statements: [],
			},
		);
	}
	if (latest?.systemTo !== SYSTEM_TO_SENTINEL)
	{
		return plan(
			unitOfWork,
			{
				change: change("unchanged"),
				statements: [],
			},
		);
	}
	return plan(
		unitOfWork,
		{
			change: change("phased-out"),
			statements: phaseOutStatements(unitOfWork, target, latest),
		},
	);
};

/**
 * Makes the current rows within `scope` (a partial business key, such as one blueprint's tags) equal `rows`:
 * changed rows are updated, new rows inserted, and current rows missing from `rows` phased out.
 */
export const mergeList = async <TTable extends SQLiteTable, TKey extends keyof Row<TTable> & string>(
	unitOfWork: UnitOfWork,
	target: TemporalTable<TTable, TKey>,
	scope: Partial<BusinessKey<TTable, TKey>>,
	rows: TemporalValues<TTable>[],
	options: WriteOptions = {},
): Promise<RowChange[]> =>
{
	const incoming = rows as Record<string, unknown>[];
	const scopeEntries = Object.entries(scope);
	for (const row of incoming)
	{
		if (!scopeEntries.every(([columnName, value]) => sameValue(row[columnName], value)))
		{
			throw new Error(
				`${target.name} ${JSON.stringify(keyOf(target, row))} is outside the merge scope ${JSON.stringify(scope)}`,
			);
		}
	}

	const allVersions = (await history(unitOfWork.db, target, scope)) as Record<string, unknown>[];
	const keyId = (row: Record<string, unknown>) => JSON.stringify(keyOf(target, row));
	const currentByKey = new Map(
		allVersions.filter((row) => row.systemTo === SYSTEM_TO_SENTINEL).map((row) => [keyId(row), row]),
	);
	const missing = [...currentByKey.values()].filter(
		(row) => !incoming.some((candidate) => keyId(candidate) === keyId(row)),
	);

	if (isStale(allVersions, options))
	{
		return incoming.map((row) =>
		{
			claim(unitOfWork, target, keyOf(target, row));
			return plan(
				unitOfWork,
				{
					change:
					{
						table: target.name,
						key: keyOf(target, row),
						outcome: "skipped-stale",
					},
					statements: [],
				},
			);
		});
	}

	const changes = incoming.map((row) =>
	{
		claim(unitOfWork, target, keyOf(target, row));
		return planReplacement(unitOfWork, target, currentByKey.get(keyId(row)), row);
	});
	for (const row of missing)
	{
		const key = keyOf(target, row);
		claim(unitOfWork, target, key);
		changes.push(
			plan(
				unitOfWork,
				{
					change:
					{
						table: target.name,
						key,
						outcome: "phased-out",
					},
					statements: phaseOutStatements(unitOfWork, target, row),
				},
			),
		);
	}
	return changes;
};

/** Inserts a row of a content-addressed (immutable) table, leaving an existing row with that key untouched. */
export const insertIfAbsent = async <TTable extends SQLiteTable, TKey extends keyof Row<TTable> & string>(
	unitOfWork: UnitOfWork,
	target: ContentAddressedTable<TTable, TKey>,
	values: InferInsertModel<TTable>,
): Promise<RowChange> =>
{
	const key = keyOf(target, values as Record<string, unknown>);
	claim(unitOfWork, target, key);
	const existing = await selectRows(unitOfWork.db, target, matchesKey(target, key), [], 1);
	if (existing.length > 0)
	{
		return plan(
			unitOfWork,
			{
				change:
				{
					table: target.name,
					key,
					outcome: "unchanged",
				},
				statements: [],
			},
		);
	}
	return plan(
		unitOfWork,
		{
			change:
			{
				table: target.name,
				key,
				outcome: "inserted",
			},
			statements: [unitOfWork.db.insert(target.table).values(values).onConflictDoNothing()],
			settle: ([result]) => ((result as D1Result).meta.changes === 1 ? "inserted" : "unchanged"),
		},
	);
};

const isWrite = (change: RowChange) => change.outcome !== "unchanged" && change.outcome !== "skipped-stale";

/**
 * Bumps the `number` of a composite's version row once per unit of work if any of `memberChanges` (the changes to
 * the composite's tables) wrote a row. Later calls for the same composite in the same unit of work are no-ops.
 */
export const bumpVersion = async <TTable extends SQLiteTable, TKey extends keyof Row<TTable> & string>(
	unitOfWork: UnitOfWork,
	target: TemporalTable<TTable, TKey>,
	key: BusinessKey<TTable, TKey>,
	memberChanges: readonly RowChange[],
	values: Partial<TemporalValues<TTable>> = {},
): Promise<RowChange> =>
{
	const businessKey = keyOf(target, key);
	const id = `${target.name} ${JSON.stringify(businessKey)}`;
	const unchanged: RowChange =
	{
		table: target.name,
		key: businessKey,
		outcome: "unchanged",
	};
	if (unitOfWork.written.has(id) || !memberChanges.some(isWrite))
	{
		return unchanged;
	}
	claim(unitOfWork, target, businessKey);
	const current = (await findCurrent(unitOfWork.db, target, key)) as Record<string, unknown> | undefined;
	const next =
	{
		...current,
		...values,
		...businessKey,
		number: ((current?.number as number | undefined) ?? 0) + 1,
	};
	return planReplacement(unitOfWork, target, current, next);
};

const conflictPattern = /UNIQUE constraint failed|temporal conflict|malformed JSON/;

const isConflict = (error: unknown): boolean =>
	error instanceof Error && (conflictPattern.test(error.message) || isConflict(error.cause));

/** Runs every planned statement in one D1 batch, which commits or rolls back as a whole. */
export const commit = async (unitOfWork: UnitOfWork): Promise<CommitResult> =>
{
	if (unitOfWork.committed)
	{
		throw new Error("This unit of work is already committed");
	}
	unitOfWork.committed = true;
	const statements = unitOfWork.planned.flatMap((write) => write.statements);
	if (statements.length === 0)
	{
		return {
			status: "committed",
			changes: unitOfWork.planned.map((write) => write.change),
		};
	}

	let results: unknown[];
	try
	{
		results = await unitOfWork.db.batch(statements as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
	}
	catch (error)
	{
		if (!isConflict(error))
		{
			throw error;
		}
		return {
			status: "conflict",
			changes: unitOfWork.planned.map((write) =>
				write.statements.length > 0
					?
						{
							...write.change,
							outcome: "conflict",
						}
					: write.change,
			),
		};
	}

	let offset = 0;
	const changes = unitOfWork.planned.map((write) =>
	{
		const own = results.slice(offset, offset + write.statements.length);
		offset += write.statements.length;
		return write.settle
			?
				{
					...write.change,
					outcome: write.settle(own),
				}
			: write.change;
	});
	return {
		status: "committed",
		changes,
	};
};
