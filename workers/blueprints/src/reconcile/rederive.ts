// Re-derives the game data of stored blueprint strings. The rows derived from a string (its nested blueprints,
// icons, recipes, entities and mods) are written once, when the string first arrives, by whatever parser existed
// then; history also carries rows from an older implementation. When the parser is corrected, those rows are
// stale. This walks the strings in sha order, a page per call: each string is read from the bucket and parsed with
// today's parser, and any table whose stored rows for that string differ gets them replaced, in one batch per
// string. A string whose rows already match is not written, so running it again changes nothing.
import {asc, eq, gt} from "drizzle-orm";
import type {BatchItem} from "drizzle-orm/batch";
import type {SQLiteColumn, SQLiteTable} from "drizzle-orm/sqlite-core";
import {buildModPackLookup, extractGameData} from "../../../../src/parsing/gameData.ts";
import type {IngestDependencies} from "../ingest/applyEvent.ts";
import
{
	blueprintGameData,
	blueprintGameDataEntity,
	blueprintGameDataIcon,
	blueprintGameDataRecipe,
	blueprintString,
	blueprintStringMod,
	factorioItem,
} from "../schema.ts";
import {getBlueprintString} from "../strings.ts";
import {SYSTEM_TO_SENTINEL} from "../temporal/columns.ts";

// D1 allows 100 bound parameters per statement.
const MAX_BOUND_PARAMETERS = 100;

export interface RederiveRequest
{
	/** Only strings whose sha sorts after this; "" starts from the beginning. */
	after: string;
	/** Strings per call. */
	limit: number;
	/** Report without writing. */
	dryRun: boolean;
}

export interface RederiveReport
{
	checked: number;
	/** The last sha of a full page, to pass as `after` next; null once the strings are exhausted. */
	next: string | null;
	/** Strings the bucket does not hold, which are left as they are. */
	missing: string[];
	/** Strings whose stored rows differed (and, unless a dry run, were replaced), with the tables that did. */
	changed:
	{
		sha: string;
		tables: string[];
	}[];
}

type Row = Record<string, unknown>;

interface DerivedTable
{
	name: string;
	table: SQLiteTable;
	sha: SQLiteColumn;
	/** The table's column names, in the order rows are compared. */
	fields: string[];
}

const TABLES: Record<"gameData" | "icons" | "recipes" | "entities" | "mods", DerivedTable> =
{
	gameData:
	{
		name: "blueprint_game_data",
		table: blueprintGameData,
		sha: blueprintGameData.sha,
		fields: [
			"sha",
			"position",
			"versionNumber",
			"version1",
			"version2",
			"version3",
			"version4",
			"versionString",
			"label",
			"itemType",
		],
	},
	icons:
	{
		name: "blueprint_game_data_icon",
		table: blueprintGameDataIcon,
		sha: blueprintGameDataIcon.sha,
		fields: ["sha", "position", "index", "signalName", "signalType"],
	},
	recipes:
	{
		name: "blueprint_game_data_recipe",
		table: blueprintGameDataRecipe,
		sha: blueprintGameDataRecipe.sha,
		fields: ["sha", "position", "recipe", "count"],
	},
	entities:
	{
		name: "blueprint_game_data_entity",
		table: blueprintGameDataEntity,
		sha: blueprintGameDataEntity.sha,
		fields: ["sha", "position", "entity", "count"],
	},
	mods:
	{
		name: "blueprint_string_mod",
		table: blueprintStringMod,
		sha: blueprintStringMod.blueprintStringSha,
		fields: ["blueprintStringSha", "modPackName"],
	},
};

/** A table's rows as one canonical text, whatever order they come in. */
const canonical = (target: DerivedTable, rows: readonly Row[]): string =>
	rows
		.map((row) => JSON.stringify(target.fields.map((field) => row[field] ?? null)))
		.sort()
		.join("\n");

export const rederiveGameData = async (
	dependencies: IngestDependencies,
	request: RederiveRequest,
): Promise<RederiveReport> =>
{
	const {db} = dependencies;
	const page = await db
		.select(
			{
				sha: blueprintString.sha,
			},
		)
		.from(blueprintString)
		.where(gt(blueprintString.sha, request.after))
		.orderBy(asc(blueprintString.sha))
		.limit(request.limit);
	const report: RederiveReport =
	{
		checked: page.length,
		next: page.length === request.limit ? (page.at(-1)?.sha ?? null) : null,
		missing: [],
		changed: [],
	};
	if (page.length === 0) return report;

	const modPacks = buildModPackLookup(
		await db
			.select(
				{
					name: factorioItem.name,
					modPackName: factorioItem.modPackName,
				},
			)
			.from(factorioItem)
			.where(eq(factorioItem.systemTo, SYSTEM_TO_SENTINEL)),
	);
	for (const {sha} of page)
	{
		const content = await getBlueprintString(dependencies.strings, sha);
		if (content === null)
		{
			report.missing.push(sha);
			continue;
		}
		const derived = extractGameData(sha, content, modPacks) as unknown as Record<keyof typeof TABLES, Row[]>;
		const statements: BatchItem<"sqlite">[] = [];
		const differing: string[] = [];
		for (const [part, target] of Object.entries(TABLES) as [keyof typeof TABLES, DerivedTable][])
		{
			const stored = (await db.select().from(target.table).where(eq(target.sha, sha))) as Row[];
			if (canonical(target, stored) === canonical(target, derived[part])) continue;
			differing.push(target.name);
			statements.push(db.delete(target.table).where(eq(target.sha, sha)));
			const rowsPerStatement = Math.floor(MAX_BOUND_PARAMETERS / target.fields.length);
			for (let start = 0; start < derived[part].length; start += rowsPerStatement)
			{
				statements.push(db.insert(target.table).values(derived[part].slice(start, start + rowsPerStatement)));
			}
		}
		if (differing.length === 0) continue;
		report.changed.push(
			{
				sha,
				tables: differing.sort(),
			},
		);
		if (!request.dryRun)
		{
			await db.batch(statements as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
		}
	}
	return report;
};
