// @vitest-environment node
import {readFileSync} from "node:fs";
import {zlibSync} from "fflate";
import {describe, expect, it} from "vite-plus/test";
import
{
	buildModPackLookup,
	computeBlueprintStringSha,
	extractBlueprintStringGameData,
	extractGameData,
} from "./gameData";

function encode(json: unknown): string
{
	const compressed = zlibSync(new TextEncoder().encode(JSON.stringify(json)));
	return "0" + Buffer.from(compressed).toString("base64");
}

const SHA = "0123456789abcdef0123456789abcdef01234567";
const VERSION_1_1_110 = 281479278886912;

const modPacks = buildModPackLookup([
	{
		name: "assembling-machine-2",
		modPackName: "base",
	},
	{
		name: "iron-gear-wheel",
		modPackName: "base",
	},
	{
		name: "transport-belt",
		modPackName: "base",
	},
	{
		name: "transport-belt",
		modPackName: "creative-mod",
	},
]);

function gameDataRow(position: string, itemType: string | null, label: string | null = null)
{
	return {
		sha: SHA,
		position,
		versionNumber: VERSION_1_1_110,
		version1: 1,
		version2: 1,
		version3: 110,
		version4: 0,
		versionString: "1.1.110.0",
		label,
		itemType,
	};
}

describe("computeBlueprintStringSha", () =>
{
	it("hashes the UTF-8 bytes with SHA-256", async () =>
	{
		expect(await computeBlueprintStringSha("abc")).toBe(
			"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
		);
		expect(await computeBlueprintStringSha("é")).toBe(
			"4a99557e4033c3539de2eb65472017cad5f9557f7a0625a09f1c3f6e2ba69c4c",
		);
	});
});

describe("extractGameData", () =>
{
	it("reads strings whose zlib stream is cut short after the complete JSON", () =>
	{
		// A real string from factorio.school: unpadded base64 and a deflate stream missing its final bytes.
		const blueprintString = readFileSync(new URL("fixtures/truncatedZlibBook.txt", import.meta.url), "utf8");
		const version = (position: string, label: string, itemType: string) => (
		{
			sha: SHA,
			position,
			versionNumber: 68722819072,
			version1: 0,
			version2: 16,
			version3: 51,
			version4: 0,
			versionString: "0.16.51.0",
			label,
			itemType,
		});

		expect(extractGameData(SHA, blueprintString, modPacks).gameData).toEqual([
			version("1", "Train-Port", "blueprint-book"),
			version("1.1", "Main Station", "blueprint"),
			version("1.2", "Default Station", "blueprint"),
		]);
	});

	it("extracts a blueprint's row, icons, entity and recipe counts, and mod packs", () =>
	{
		const blueprintString = encode(
			{
				blueprint:
				{
					item: "blueprint",
					label: "Gears",
					version: VERSION_1_1_110,
					icons: [
						{
							signal:
							{
								type: "item",
								name: "iron-gear-wheel",
							},
							index: 1,
						},
						{
							signal:
							{
								type: "item",
								name: "transport-belt",
							},
							index: 2,
						},
					],
					entities: [
						{
							entity_number: 1,
							name: "assembling-machine-2",
							recipe: "iron-gear-wheel",
						},
						{
							entity_number: 2,
							name: "assembling-machine-2",
							recipe: "iron-gear-wheel",
						},
						{
							entity_number: 3,
							name: "transport-belt",
						},
					],
				},
			},
		);

		expect(extractGameData(SHA, blueprintString, modPacks)).toEqual(
			{
				sha: SHA,
				gameData: [gameDataRow("1", "blueprint", "Gears")],
				icons: [
					{
						sha: SHA,
						position: "1",
						index: 1,
						signalName: "iron-gear-wheel",
						signalType: "item",
					},
					{
						sha: SHA,
						position: "1",
						index: 2,
						signalName: "transport-belt",
						signalType: "item",
					},
				],
				recipes: [
					{
						sha: SHA,
						position: "1",
						recipe: "iron-gear-wheel",
						count: 2,
					},
				],
				entities: [
					{
						sha: SHA,
						position: "1",
						entity: "assembling-machine-2",
						count: 2,
					},
					{
						sha: SHA,
						position: "1",
						entity: "transport-belt",
						count: 1,
					},
				],
				mods: [
					{
						blueprintStringSha: SHA,
						modPackName: "base",
					},
					{
						blueprintStringSha: SHA,
						modPackName: "creative-mod",
					},
				],
			},
		);
	});

	it("positions nested book content by its index field plus one, not by array order", () =>
	{
		const blueprintString = encode(
			{
				blueprint_book:
				{
					item: "blueprint-book",
					version: VERSION_1_1_110,
					blueprints: [
						{
							index: 4,
							upgrade_planner:
							{
								item: "upgrade-planner",
								version: VERSION_1_1_110,
							},
						},
						{
							index: 0,
							blueprint_book:
							{
								item: "blueprint-book",
								version: VERSION_1_1_110,
								blueprints: [
									{
										index: 2,
										deconstruction_planner:
										{
											item: "deconstruction-planner",
											version: VERSION_1_1_110,
										},
									},
								],
							},
						},
					],
				},
			},
		);

		expect(extractGameData(SHA, blueprintString, modPacks)).toEqual(
			{
				sha: SHA,
				gameData: [
					gameDataRow("1", "blueprint-book"),
					gameDataRow("1.5", "upgrade-planner"),
					gameDataRow("1.1", "blueprint-book"),
					gameDataRow("1.1.3", "deconstruction-planner"),
				],
				icons: [],
				recipes: [],
				entities: [],
				mods: [],
			},
		);
	});

	it("drops icons without a signal type or name and numbers the rest from one", () =>
	{
		// Factorio 2.0 omits the signal type for items, so such icons are dropped.
		const blueprintString = encode(
			{
				blueprint:
				{
					item: "blueprint",
					version: VERSION_1_1_110,
					icons: [
						{
							signal:
							{
								name: "iron-plate",
							},
							index: 1,
						},
						{
							signal:
							{
								type: "virtual",
							},
							index: 2,
						},
						{
							signal:
							{
								type: "virtual",
								name: "signal-A",
							},
							index: 3,
						},
					],
				},
			},
		);

		expect(extractGameData(SHA, blueprintString, modPacks).icons).toEqual([
			{
				sha: SHA,
				position: "1",
				index: 1,
				signalName: "signal-A",
				signalType: "virtual",
			},
		]);
	});

	it("labels entities and recipes missing from the reference data as the unknown mod pack", () =>
	{
		const blueprintString = encode(
			{
				blueprint:
				{
					item: "blueprint",
					version: VERSION_1_1_110,
					entities: [
						{
							name: "se-space-elevator",
							recipe: "iron-gear-wheel",
						},
					],
				},
			},
		);

		expect(extractGameData(SHA, blueprintString, modPacks).mods).toEqual([
			{
				blueprintStringSha: SHA,
				modPackName: "unknown",
			},
			{
				blueprintStringSha: SHA,
				modPackName: "base",
			},
		]);
	});

	it("coerces scalars to the types of the fields they fill", () =>
	{
		const blueprintString = encode(
			{
				blueprint:
				{
					item: "blueprint",
					label: 42,
					version: String(VERSION_1_1_110),
					entities: [
						{
							name: "transport-belt",
							items:
							{
								"speed-module": 2,
							},
						},
					],
				},
			},
		);

		expect(extractGameData(SHA, blueprintString, modPacks).gameData).toEqual([gameDataRow("1", "blueprint", "42")]);
	});

	it.each([
		[
			"a label that is an object",
			{
				blueprint:
				{
					item: "blueprint",
					label:
					{
						text: "x",
					},
				},
			},
		],
		[
			"icons that are not a list",
			{
				blueprint:
				{
					item: "blueprint",
					icons:
					{
						signal:
						{
							type: "item",
							name: "x",
						},
					},
				},
			},
		],
		[
			"a version that is not a number",
			{
				blueprint:
				{
					item: "blueprint",
					version: "1.1.110",
				},
			},
		],
		[
			"entity items with non-numeric counts",
			{
				blueprint:
				{
					item: "blueprint",
					entities: [
						{
							name: "chest",
							items:
							{
								coal: "lots",
							},
						},
					],
				},
			},
		],
		[
			"a malformed sibling that is read but not used",
			{
				blueprint_book:
				{
					item: "blueprint-book",
				},
				blueprint:
				{
					label: [],
				},
			},
		],
	] as const)("falls back to a placeholder row for %s", (_, json) =>
	{
		expect(extractGameData(SHA, encode(json), modPacks)).toEqual(
			{
				sha: SHA,
				gameData: [
					{
						sha: SHA,
						position: "1",
						versionNumber: null,
						version1: 0,
						version2: 0,
						version3: 0,
						version4: 0,
						versionString: "unknown",
						label: null,
						itemType: "blueprint",
					},
				],
				icons: [],
				recipes: [],
				entities: [],
				mods: [],
			},
		);
	});

	it("falls back to version 0.14.0.0 for undecodable strings that look like pre-0.15 gzipped blueprints", () =>
	{
		expect(extractGameData(SHA, "H4sIAAAAAAAA", modPacks).gameData).toEqual([
			{
				sha: SHA,
				position: "1",
				versionNumber: 60129542144,
				version1: 0,
				version2: 14,
				version3: 0,
				version4: 0,
				versionString: "0.14.0.0",
				label: null,
				itemType: "blueprint",
			},
		]);
	});

	it("produces no rows for valid JSON with no known content", () =>
	{
		expect(
			extractGameData(
				SHA,
				encode(
					{
						something_else: {},
					},
				),
				modPacks,
			),
		).toEqual(
			{
				sha: SHA,
				gameData: [],
				icons: [],
				recipes: [],
				entities: [],
				mods: [],
			},
		);
	});
});

describe("extractBlueprintStringGameData", () =>
{
	it("keys every row by the string's sha", async () =>
	{
		const blueprintString = encode(
			{
				blueprint:
				{
					item: "blueprint",
					version: VERSION_1_1_110,
					entities: [
						{
							name: "transport-belt",
						},
					],
				},
			},
		);
		const sha = await computeBlueprintStringSha(blueprintString);

		const result = await extractBlueprintStringGameData(blueprintString, modPacks);

		expect(result).toEqual(
			{
				sha,
				gameData: [
					{
						...gameDataRow("1", "blueprint"),
						sha,
					},
				],
				icons: [],
				recipes: [],
				entities: [
					{
						sha,
						position: "1",
						entity: "transport-belt",
						count: 1,
					},
				],
				mods: [
					{
						blueprintStringSha: sha,
						modPackName: "base",
					},
					{
						blueprintStringSha: sha,
						modPackName: "creative-mod",
					},
				],
			},
		);
	});
});
