import {describe, expect, it} from "vite-plus/test";
import fixtures from "./fixtures/realtime.json";
import {mapComments} from "./mapComments.ts";
import type {RealtimeComment} from "./realtime.ts";
import type {CommentRow} from "./rows.ts";

interface CommentsFixture
{
	blueprintKey: string;
	comments: Record<string, RealtimeComment>;
	blueprintExists: boolean;
	expected: CommentRow[];
}

const byId = (rows: CommentRow[]) => [...rows].sort((a, b) => a.id.localeCompare(b.id));

describe("mapComments", () =>
{
	it.each(fixtures.comments as unknown as CommentsFixture[])("$blueprintKey", (fixture) =>
	{
		const blueprintKeys = new Set(fixture.blueprintExists ? [fixture.blueprintKey] : []);

		expect(
			byId(
				mapComments(
					fixture.blueprintKey,
					fixture.comments,
					{
						blueprintKeys,
					},
				),
			),
		).toStrictEqual(byId(fixture.expected));
	});

	it("skips comments without content or a creation time", () =>
	{
		const comments: Record<string, RealtimeComment> =
		{
			empty:
			{
				content: "",
				createdAt: 1,
				authorId: "uid",
			},
			undated:
			{
				content: "text",
				authorId: "uid",
			},
			kept:
			{
				content: "text",
				createdAt: "2",
				authorId: "uid",
				isDeleted: true,
			},
		};

		expect(
			mapComments(
				"-key",
				comments,
				{
					blueprintKeys: new Set(["-key"]),
				},
			),
		).toStrictEqual([
			{
				id: "kept",
				replyToId: null,
				createdById: "uid",
				createdOn: 2,
				lastUpdatedById: "uid",
				blueprintKey: "-key",
				text: "text",
				deleted: true,
			},
		]);
	});
});
