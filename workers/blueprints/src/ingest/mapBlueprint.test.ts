import {describe, expect, it} from "vite-plus/test";
import fixtures from "./fixtures/blueprints.json";
import {mapBlueprint, mergeImgurImages} from "./mapBlueprint.ts";
import type {RealtimeBlueprint, RealtimeBlueprintPrivate} from "./realtime.ts";
import type {BlueprintRows, ImgurImageRow} from "./rows.ts";

interface BlueprintFixture
{
	case: string;
	key: string;
	blueprint: RealtimeBlueprint;
	blueprintPrivate?: RealtimeBlueprintPrivate;
	thumbnail?: string;
	expected: BlueprintRows;
}

interface DuplicateImageFixture
{
	imgurId: string;
	blueprints: Omit<BlueprintFixture, "case" | "expected">[];
	expected: ImgurImageRow;
}

const byTagName = (rows: BlueprintRows) => (
{
	...rows,
	blueprintTags: [...rows.blueprintTags].sort((a, b) =>
		`${a.tagCategory}/${a.tagName}`.localeCompare(`${b.tagCategory}/${b.tagName}`),
	),
});

describe("mapBlueprint", () =>
{
	it.each(fixtures.blueprints as unknown as BlueprintFixture[])("$case: $key", async (fixture) =>
	{
		const rows = await mapBlueprint(
			fixture.key,
			fixture.blueprint,
			{
				blueprintPrivate: fixture.blueprintPrivate,
				thumbnail: fixture.thumbnail,
			},
		);

		expect(rows === undefined ? rows : byTagName(rows)).toStrictEqual(byTagName(fixture.expected));
	});

	it("skips a blueprint without a blueprint string", async () =>
	{
		const rows = await mapBlueprint(
			"-key",
			{
				title: "No string",
			},
			{},
		);

		expect(rows).toBeUndefined();
	});

	it("defaults a missing title and description and truncates long ones", async () =>
	{
		const rows = await mapBlueprint(
			"-key",
			{
				title: "",
				blueprintString: "0abc",
				image:
				{
					id: "abc",
					type: "image/png",
				},
				authorId: "uid",
				createdDate: 1,
			},
			{},
		);
		const long = await mapBlueprint(
			"-key",
			{
				title: "t".repeat(600),
				descriptionMarkdown: "d".repeat(262_145),
				blueprintString: "0abc",
				image:
				{
					id: "abc",
					type: "image/png",
				},
				authorId: "uid",
				createdDate: 1,
			},
			{},
		);

		expect(
			{
				title: rows?.blueprint.title,
				description: rows?.blueprint.descriptionMarkdown,
				longTitle: long?.blueprint.title.length,
				longDescription: long?.blueprint.descriptionMarkdown.length,
			},
		).toStrictEqual(
			{
				title: "Untitled",
				description: "TODO: Add description",
				longTitle: 512,
				longDescription: 262_144,
			},
		);
	});
});

describe("mergeImgurImages", () =>
{
	it.each(fixtures.duplicateImages as unknown as DuplicateImageFixture[])("$imgurId", async (fixture) =>
	{
		const images: ImgurImageRow[] = [];
		for (const each of fixture.blueprints)
		{
			const rows = await mapBlueprint(
				each.key,
				each.blueprint,
				{
					blueprintPrivate: each.blueprintPrivate,
					thumbnail: each.thumbnail,
				},
			);
			images.push(rows!.imgurImage);
		}

		expect(mergeImgurImages(images)).toStrictEqual([fixture.expected]);
	});
});
