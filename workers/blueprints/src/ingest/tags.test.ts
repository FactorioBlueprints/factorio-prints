import {describe, expect, it} from "vite-plus/test";
import fixtures from "./fixtures/realtime.json";
import type {TagRow} from "./rows.ts";
import {mapTagList, parseTag} from "./tags.ts";

const byName = (tags: TagRow[]) =>
	[...tags].sort((a, b) => `${a.category}/${a.name}`.localeCompare(`${b.category}/${b.name}`));

describe("mapTagList", () =>
{
	it("keeps existing ordinals and skips unknown categories", () =>
	{
		expect(byName(mapTagList(fixtures.tags.byTag, fixtures.tags.existing as unknown as TagRow[]))).toStrictEqual(
			byName(fixtures.tags.expected as unknown as TagRow[]),
		);
	});

	it("numbers new tags after the highest existing ordinal and decodes URL-encoded keys", () =>
	{
		const existing: TagRow[] = [
			{
				category: "belt",
				name: "balancer",
				ordinal: 7,
			},
		];
		const byTag =
		{
			belt:
			{
				balancer: {},
				tap: {},
			},
			"mods%2Fbobs+mods":
			{
				"-key": true,
			},
			tag:
			{
				other: {},
			},
		};

		expect(mapTagList(byTag, existing)).toStrictEqual([
			{
				category: "belt",
				name: "balancer",
				ordinal: 7,
			},
			{
				category: "belt",
				name: "tap",
				ordinal: 8,
			},
			{
				category: "mods",
				name: "bobs mods",
				ordinal: 9,
			},
		]);
	});
});

describe("parseTag", () =>
{
	it.each([
		[
			"/belt/balancer/",
			{
				category: "belt",
				name: "balancer",
			},
		],
		[
			"belt/balancer",
			{
				category: "belt",
				name: "balancer",
			},
		],
		[
			"/mods/bobs/extra/",
			{
				category: "mods",
				name: "bobs",
			},
		],
		["/tag/anything/", undefined],
	] as const)("%s", (tag, expected) =>
	{
		expect(parseTag(tag)).toStrictEqual(expected);
	});
});
