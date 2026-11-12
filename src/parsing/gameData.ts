import {decodeBlueprintJson} from "./blueprintDecoding";

/*
 * Derives the "game data" rows that factorio.school's history database holds for a
 * blueprint string: one BLUEPRINT_GAME_DATA row per blueprint, book, or planner (nested ones too), its icons, entity
 * and recipe counts per blueprint, and the mod packs that the entity and recipe names belong to.
 *
 * A string with a malformed value in any field read below yields a single placeholder row. The readers coerce values
 * as strictly as the reference converter did, so a string it rejected is rejected here too.
 */

export interface BlueprintGameDataRow
{
	sha: string;
	position: string;
	versionNumber: number | null;
	version1: number;
	version2: number;
	version3: number;
	version4: number;
	versionString: string;
	label: string | null;
	itemType: string | null;
}

export interface BlueprintGameDataIconRow
{
	sha: string;
	position: string;
	index: number;
	signalName: string;
	signalType: string;
}

export interface BlueprintGameDataRecipeRow
{
	sha: string;
	position: string;
	recipe: string;
	count: number;
}

export interface BlueprintGameDataEntityRow
{
	sha: string;
	position: string;
	entity: string;
	count: number;
}

export interface BlueprintStringModRow
{
	blueprintStringSha: string;
	modPackName: string;
}

export interface BlueprintStringGameData
{
	sha: string;
	gameData: BlueprintGameDataRow[];
	icons: BlueprintGameDataIconRow[];
	recipes: BlueprintGameDataRecipeRow[];
	entities: BlueprintGameDataEntityRow[];
	mods: BlueprintStringModRow[];
}

export type ModPackLookup = ReadonlyMap<string, readonly string[]>;

export function buildModPackLookup(
	factorioItems: Iterable<
	{
		name: string;
		modPackName: string;
	}>,
): ModPackLookup
{
	const modPacksByName = new Map<string, string[]>();
	for (const {name, modPackName} of factorioItems)
	{
		const modPackNames = modPacksByName.get(name);
		if (modPackNames === undefined)
		{
			modPacksByName.set(name, [modPackName]);
		}
		else
		{
			modPackNames.push(modPackName);
		}
	}
	return modPacksByName;
}

/** Lowercase hex SHA-256 of the UTF-8 bytes of the blueprint string, the key of every row. */
export async function computeBlueprintStringSha(blueprintString: string): Promise<string>
{
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(blueprintString));
	return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function extractBlueprintStringGameData(
	blueprintString: string,
	modPacks: ModPackLookup,
): Promise<BlueprintStringGameData>
{
	const sha = await computeBlueprintStringSha(blueprintString);
	return extractGameData(sha, blueprintString, modPacks);
}

const UNKNOWN_MOD_PACK = "unknown";

// Strings that cannot be read get version 0.14.0.0 when they look like gzipped (pre-0.15) blueprints.
const OLD_BLUEPRINT_VERSION = 14 * 2 ** 32;

/** Like {@link extractBlueprintStringGameData}, for callers that already know the sha. */
export function extractGameData(sha: string, blueprintString: string, modPacks: ModPackLookup): BlueprintStringGameData
{
	const result: BlueprintStringGameData =
	{
		sha,
		gameData: [],
		icons: [],
		recipes: [],
		entities: [],
		mods: [],
	};

	let content: BlueprintContent;
	try
	{
		content = readBlueprintContent(decodeBlueprintJson(blueprintString));
	}
	catch
	{
		const version = blueprintString.startsWith("H4s") ? OLD_BLUEPRINT_VERSION : null;
		result.gameData.push(createGameDataRow(sha, "1", "blueprint", version, null));
		return result;
	}

	addContent(result, content, [1]);

	const modPackNames = new Set<string>();
	const addModPacks = (name: string) =>
	{
		const names = modPacks.get(name);
		if (names === undefined || names.length === 0)
		{
			modPackNames.add(UNKNOWN_MOD_PACK);
			return;
		}
		for (const modPackName of names) modPackNames.add(modPackName);
	};
	for (const {entity} of result.entities) addModPacks(entity);
	for (const {recipe} of result.recipes) addModPacks(recipe);
	for (const modPackName of modPackNames)
		result.mods.push(
			{
				blueprintStringSha: sha,
				modPackName,
			},
		);

	return result;
}

interface VersionedContent
{
	item: string | null;
	label: string | null;
	version: bigint | null;
}

interface Signal
{
	type: string | null;
	name: string | null;
}

interface DescribedContent extends VersionedContent
{
	icons: (Signal | null)[];
}

interface Entity
{
	name: string | null;
	recipe: string | null;
}

interface Blueprint extends DescribedContent
{
	entities: Entity[];
}

interface BlueprintBook extends DescribedContent
{
	blueprints:
	{
		index: bigint | null;
		content: BlueprintContent;
	}[];
}

type BlueprintContent =
	|
	  {
			kind: "blueprint-book";
			value: BlueprintBook;
	  }
	|
	  {
			kind: "blueprint";
			value: Blueprint;
	  }
	|
	  {
			kind: "planner";
			value: VersionedContent;
	  }
	|
	  {
			kind: "unknown";
	  };

function addContent(result: BlueprintStringGameData, content: BlueprintContent, path: number[]): void
{
	if (content.kind === "unknown")
	{
		return;
	}
	const {value} = content;
	const position = path.join(".");
	result.gameData.push(createGameDataRow(result.sha, position, value.item, value.version, value.label));

	if (content.kind === "planner")
	{
		return;
	}

	content.value.icons
		.filter(
			(
				signal,
			): signal is
			{
				type: string;
				name: string;
			} => signal?.name != null && signal.type != null,
		)
		.forEach((signal, index) =>
		{
			result.icons.push(
				{
					sha: result.sha,
					position,
					index: index + 1,
					signalName: signal.name,
					signalType: signal.type,
				},
			);
		});

	if (content.kind === "blueprint")
	{
		for (const [entity, count] of countBy(content.value.entities.map((each) => each.name)))
		{
			result.entities.push(
				{
					sha: result.sha,
					position,
					entity,
					count,
				},
			);
		}
		for (const [recipe, count] of countBy(content.value.entities.map((each) => each.recipe)))
		{
			result.recipes.push(
				{
					sha: result.sha,
					position,
					recipe,
					count,
				},
			);
		}
		return;
	}

	content.value.blueprints.forEach(({index, content: child}, arrayIndex) =>
	{
		addContent(result, child, [...path, Number(index ?? BigInt(arrayIndex)) + 1]);
	});
}

function countBy(names: (string | null)[]): Map<string, number>
{
	const counts = new Map<string, number>();
	for (const name of names)
	{
		if (name !== null) counts.set(name, (counts.get(name) ?? 0) + 1);
	}
	return counts;
}

function createGameDataRow(
	sha: string,
	position: string,
	itemType: string | null,
	version: bigint | number | null,
	label: string | null,
): BlueprintGameDataRow
{
	if (version === null)
	{
		return {
			sha,
			position,
			versionNumber: null,
			version1: 0,
			version2: 0,
			version3: 0,
			version4: 0,
			versionString: "unknown",
			label,
			itemType,
		};
	}
	const bigVersion = BigInt(version);
	const part = (shift: bigint) => Number((bigVersion >> shift) & 0xffffn);
	const [version1, version2, version3, version4] = [part(48n), part(32n), part(16n), part(0n)];
	return {
		sha,
		position,
		versionNumber: Number(bigVersion),
		version1,
		version2,
		version3,
		version4,
		versionString: `${version1}.${version2}.${version3}.${version4}`,
		label,
		itemType,
	};
}

// ---- Strict readers. Each throws StrictBindingError where a value does not fit its field. ----

class StrictBindingError extends Error
{
}

type JsonObject = Record<string, unknown>;

function fail(message: string): never
{
	throw new StrictBindingError(message);
}

function readObject(value: unknown): JsonObject | null
{
	if (value === null || value === undefined) return null;
	if (typeof value === "object" && !Array.isArray(value)) return value as JsonObject;
	return fail(`Expected an object but found ${JSON.stringify(value)}`);
}

function readList<T>(value: unknown, readElement: (element: unknown) => T): T[]
{
	if (value === null || value === undefined) return [];
	if (!Array.isArray(value)) return fail(`Expected an array but found ${JSON.stringify(value)}`);
	return value.map(readElement);
}

// Coerces any scalar to a string, and rejects arrays and objects.
function readString(value: unknown): string | null
{
	if (value === null || value === undefined) return null;
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") return String(value);
	return fail(`Expected a string but found ${JSON.stringify(value)}`);
}

// Accepts integers, truncates floats, parses numeric strings, and maps "" to null.
function readIntegral(value: unknown, min: bigint, max: bigint): bigint | null
{
	if (value === null || value === undefined) return null;
	let result: bigint;
	if (typeof value === "number")
	{
		if (!Number.isFinite(value)) return fail(`Expected an integer but found ${value}`);
		result = BigInt(Math.trunc(value));
	}
	else if (typeof value === "string")
	{
		const text = value.trim();
		if (text === "") return null;
		if (!/^[+-]?\d+$/.test(text)) return fail(`Expected an integer but found ${JSON.stringify(value)}`);
		result = BigInt(text);
	}
	else
	{
		return fail(`Expected an integer but found ${JSON.stringify(value)}`);
	}
	if (result < min || result > max) return fail(`Integer out of range: ${result}`);
	return result;
}

const LONG_MIN = -(2n ** 63n);
const LONG_MAX = 2n ** 63n - 1n;
const INT_MIN = -(2n ** 31n);
const INT_MAX = 2n ** 31n - 1n;

function readLong(value: unknown): bigint | null
{
	return readIntegral(value, LONG_MIN, LONG_MAX);
}

function readInteger(value: unknown): bigint | null
{
	return readIntegral(value, INT_MIN, INT_MAX);
}

function readDouble(value: unknown): void
{
	if (value === null || value === undefined || typeof value === "number") return;
	if (typeof value === "string" && (value.trim() === "" || Number.isFinite(Number(value)))) return;
	fail(`Expected a number but found ${JSON.stringify(value)}`);
}

function readSignal(value: unknown): Signal | null
{
	const object = readObject(value);
	if (object === null) return null;
	return {
		type: readString(object.type),
		name: readString(object.name),
	};
}

function readIcon(value: unknown): Signal | null
{
	const object = readObject(value);
	if (object === null) return null;
	readInteger(object.index);
	return readSignal(object.signal);
}

function readVersioned(object: JsonObject): VersionedContent
{
	return {
		item: readString(object.item),
		label: readString(object.label),
		version: readLong(object.version),
	};
}

function readDescribed(object: JsonObject): DescribedContent
{
	return {
		...readVersioned(object),
		icons: readList(object.icons, readIcon),
	};
}

// Entity.items accepts {name: count} maps or [{item, count}] lists; it is checked but yields no rows.
function readItems(value: unknown): void
{
	if (value === null || value === undefined || typeof value !== "object") return;
	if (!Array.isArray(value))
	{
		try
		{
			for (const count of Object.values(value)) readInteger(count);
			return;
		}
		catch (error)
		{
			if (!(error instanceof StrictBindingError)) throw error;
		}
	}
	readList(value, (element) =>
	{
		const object = readObject(element);
		if (object !== null)
		{
			readString(object.item);
			readInteger(object.count);
		}
	});
}

function readEntity(value: unknown): Entity
{
	const object = readObject(value) ?? {};
	readItems(object.items);
	return {
		name: readString(object.name),
		recipe: readString(object.recipe),
	};
}

function readPosition(value: unknown): void
{
	const object = readObject(value);
	if (object === null) return;
	readDouble(object.x);
	readDouble(object.y);
}

function readBlueprint(object: JsonObject): Blueprint
{
	readPosition(object["snap-to-grid"]);
	return {
		...readDescribed(object),
		entities: readList(object.entities, readEntity),
	};
}

function readBlueprintBook(object: JsonObject): BlueprintBook
{
	readLong(object.active_index);
	return {
		...readDescribed(object),
		blueprints: readList(object.blueprints, (element) =>
		{
			const child = readObject(element) ?? {};
			return {
				index: readLong(child.index),
				content: readBlueprintContent(child),
			};
		}),
	};
}

function readDeconstructionPlanner(object: JsonObject): VersionedContent
{
	const settings = readObject(object.settings);
	if (settings !== null) readList(settings.icons, readIcon);
	return readVersioned(object);
}

function readUpgradePlanner(object: JsonObject): VersionedContent
{
	const settings = readObject(object.settings);
	if (settings !== null)
	{
		readList(settings.mappers, (element) =>
		{
			const mapper = readObject(element);
			if (mapper !== null)
			{
				readSignal(mapper.from);
				readSignal(mapper.to);
			}
		});
	}
	return readVersioned(object);
}

// Every present field is read (and can fail) before one is picked by priority: book, blueprint, then planners.
function readBlueprintContent(value: unknown): BlueprintContent
{
	const object = readObject(value);
	if (object === null) return fail("Blueprint content is null");
	const blueprintObject = readObject(object.blueprint);
	const bookObject = readObject(object.blueprint_book);
	const deconstructionObject = readObject(object.deconstruction_planner);
	const upgradeObject = readObject(object.upgrade_planner);

	const blueprint = blueprintObject === null ? null : readBlueprint(blueprintObject);
	const book = bookObject === null ? null : readBlueprintBook(bookObject);
	const deconstruction = deconstructionObject === null ? null : readDeconstructionPlanner(deconstructionObject);
	const upgrade = upgradeObject === null ? null : readUpgradePlanner(upgradeObject);

	if (book !== null)
		return {
			kind: "blueprint-book",
			value: book,
		};
	if (blueprint !== null)
		return {
			kind: "blueprint",
			value: blueprint,
		};
	if (deconstruction !== null)
		return {
			kind: "planner",
			value: deconstruction,
		};
	if (upgrade !== null)
		return {
			kind: "planner",
			value: upgrade,
		};
	return {
		kind: "unknown",
	};
}
