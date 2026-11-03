import {describe, expect, test} from "vite-plus/test";
import
{
	buildAuthorDisplayNameStripUpdate,
	chunkUpdate,
	extractBlueprints,
} from "../scripts/authorDisplayNameStripCore.ts";

describe("buildAuthorDisplayNameStripUpdate", () =>
{
	test("nulls author.displayName only on blueprints that still have one", () =>
	{
		const blueprints =
		{
			"-withName":
			{
				author:
				{
					displayName: "Real Name",
					userId: "u1",
				},
				title: "A",
			},
			"-withEmptyName":
			{
				author:
				{
					displayName: "",
					userId: "u2",
				},
				title: "B",
			},
			"-withoutName":
			{
				author:
				{
					userId: "u3",
				},
				title: "C",
			},
			"-nullName":
			{
				author:
				{
					displayName: null,
					userId: "u4",
				},
				title: "D",
			},
			"-noAuthor":
			{
				title: "E",
			},
			"-notAnObject": "garbage",
		};

		expect(buildAuthorDisplayNameStripUpdate(blueprints)).toStrictEqual(
			{
				"blueprints/-withEmptyName/author/displayName": null,
				"blueprints/-withName/author/displayName": null,
			},
		);
	});

	test("returns an empty update for a missing or empty blueprints node", () =>
	{
		expect(buildAuthorDisplayNameStripUpdate(null)).toStrictEqual({});
		expect(buildAuthorDisplayNameStripUpdate({})).toStrictEqual({});
	});
});

describe("extractBlueprints", () =>
{
	test("reads the blueprints node from a full database export", () =>
	{
		const blueprints =
		{
			"-a":
			{
				author:
				{
					displayName: "N",
					userId: "u",
				},
			},
		};
		expect(
			extractBlueprints(
				{
					blueprintSummaries: {},
					blueprints,
				},
			),
		).toStrictEqual(blueprints);
	});

	test("treats a blueprints-only export as the blueprints node", () =>
	{
		const blueprints =
		{
			"-a":
			{
				author:
				{
					displayName: "N",
					userId: "u",
				},
			},
		};
		expect(extractBlueprints(blueprints)).toStrictEqual(blueprints);
	});
});

describe("chunkUpdate", () =>
{
	test("splits an update into maps of at most the given size, preserving entries", () =>
	{
		const update =
		{
			a: null,
			b: null,
			c: null,
		};
		expect(chunkUpdate(update, 2)).toStrictEqual([
			{
				a: null,
				b: null,
			},
			{
				c: null,
			},
		]);
	});

	test("returns no chunks for an empty update", () =>
	{
		expect(chunkUpdate({}, 2)).toStrictEqual([]);
	});
});
