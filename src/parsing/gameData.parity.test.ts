// @vitest-environment node
import {readFileSync} from "node:fs";
import {gunzipSync} from "node:zlib";
import {describe, expect, it} from "vite-plus/test";
import {type BlueprintStringGameData, buildModPackLookup, extractBlueprintStringGameData} from "./gameData";

// Strings and the rows the reference converter derived from them, exported from factorio.school's history database.
interface ParityFixture
{
	factorioItems: [name: string, modPackName: string][];
	cases:
	{
		sha: string;
		blueprintString: string;
		expected: Omit<BlueprintStringGameData, "sha">;
	}[];
}

const fixture: ParityFixture = JSON.parse(
	gunzipSync(readFileSync(new URL("fixtures/gameDataParity.json.gz", import.meta.url))).toString("utf8"),
);

const modPacks = buildModPackLookup(
	fixture.factorioItems.map(([name, modPackName]) => (
	{
		name,
		modPackName,
	})),
);

function sortRows<T>(rows: readonly T[]): string[]
{
	return rows.map((row) => JSON.stringify(row, Object.keys(row as object).sort())).sort();
}

function normalize(data: Omit<BlueprintStringGameData, "sha">)
{
	return {
		gameData: sortRows(data.gameData),
		icons: sortRows(data.icons),
		recipes: sortRows(data.recipes),
		entities: sortRows(data.entities),
		mods: sortRows(data.mods),
	};
}

describe("extractBlueprintStringGameData parity with the reference converter", () =>
{
	it("has a corpus of real blueprint strings", () =>
	{
		expect(fixture.cases.length).toBeGreaterThan(250);
	});

	it.each(fixture.cases.map((testCase) => [testCase.sha, testCase] as const))("%s", async (sha, testCase) =>
	{
		const actual = await extractBlueprintStringGameData(testCase.blueprintString, modPacks);

		expect(
			{
				sha: actual.sha,
				...normalize(actual),
			},
		).toEqual(
			{
				sha,
				...normalize(testCase.expected),
			},
		);
	});
});
