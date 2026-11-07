export interface SqlStatement
{
	bind: (...values: unknown[]) => SqlStatement;
	first: <T = Record<string, unknown>>() => Promise<T | null>;
	run: () => Promise<
	{
		meta:
		{
			changes: number;
		};
	}>;
}

export interface SqlDatabase
{
	prepare: (sql: string) => SqlStatement;
}

export interface StringStorage
{
	put: (key: string, value: string) => Promise<unknown>;
	get: (key: string) => Promise<
	{
		text: () => Promise<string>;
	} | null>;
	delete: (key: string) => Promise<unknown>;
}

export interface BlueprintStorage
{
	database: SqlDatabase;
	strings: StringStorage;
}

type BlueprintBody = Record<string, unknown>;

const stringKey = (blueprintId: string): string => `blueprint-strings/${blueprintId}`;

const asNumber = (value: unknown): number | null => (typeof value === "number" ? value : null);

const asText = (value: unknown): string | null => (typeof value === "string" ? value : null);

const authorIdOf = (body: BlueprintBody): string | null =>
{
	const direct = asText(body.authorId);
	if (direct !== null)
	{
		return direct;
	}
	const author = body.author;
	return typeof author === "object" && author !== null ? asText((author as BlueprintBody).userId) : null;
};

/**
 * Stores everything except `blueprintString` in the database and the string in object storage. Returns false when the
 * write is older than what is already stored, so replayed or out-of-order writes cannot roll a blueprint back.
 */
export const upsertBlueprint = async (
	storage: BlueprintStorage,
	blueprintId: string,
	body: BlueprintBody,
): Promise<boolean> =>
{
	const lastUpdatedDate = asNumber(body.lastUpdatedDate);
	if (lastUpdatedDate === null)
	{
		throw new Error("Blueprint body must have a numeric lastUpdatedDate");
	}

	const existing = await storage.database
		.prepare("SELECT last_updated_date FROM blueprints WHERE id = ?")
		.bind(blueprintId)
		.first<
		{
			last_updated_date: number;
		}>();
	if (existing !== null && existing.last_updated_date > lastUpdatedDate)
	{
		return false;
	}

	const {blueprintString, ...record} = body;
	const hasString = typeof blueprintString === "string";

	// The string goes first, so the row never points at an object that has not been written yet.
	if (hasString)
	{
		await storage.strings.put(stringKey(blueprintId), blueprintString);
	}
	else
	{
		await storage.strings.delete(stringKey(blueprintId));
	}

	const result = await storage.database
		.prepare(
			`INSERT INTO blueprints (id, title, author_id, created_date, last_updated_date, number_of_favorites, has_string, record)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT (id) DO UPDATE SET
				title = excluded.title,
				author_id = excluded.author_id,
				created_date = excluded.created_date,
				last_updated_date = excluded.last_updated_date,
				number_of_favorites = excluded.number_of_favorites,
				has_string = excluded.has_string,
				record = excluded.record
			WHERE excluded.last_updated_date >= blueprints.last_updated_date`,
		)
		.bind(
			blueprintId,
			asText(body.title),
			authorIdOf(body),
			asNumber(body.createdDate),
			lastUpdatedDate,
			asNumber(body.numberOfFavorites) ?? 0,
			hasString ? 1 : 0,
			JSON.stringify(record),
		)
		.run();
	return result.meta.changes > 0;
};

export const readBlueprint = async (storage: BlueprintStorage, blueprintId: string): Promise<BlueprintBody | null> =>
{
	const row = await storage.database
		.prepare("SELECT record, has_string FROM blueprints WHERE id = ?")
		.bind(blueprintId)
		.first<
		{
			record: string;
			has_string: number;
		}>();
	if (row === null)
	{
		return null;
	}

	const record = JSON.parse(row.record) as BlueprintBody;
	if (row.has_string === 0)
	{
		return record;
	}

	const stored = await storage.strings.get(stringKey(blueprintId));
	if (stored === null)
	{
		throw new Error(`Blueprint ${blueprintId} is missing its stored string`);
	}
	return {
		...record,
		blueprintString: await stored.text(),
	};
};

export const deleteBlueprint = async (storage: BlueprintStorage, blueprintId: string): Promise<void> =>
{
	await storage.database.prepare("DELETE FROM blueprints WHERE id = ?").bind(blueprintId).run();
	await storage.strings.delete(stringKey(blueprintId));
};
