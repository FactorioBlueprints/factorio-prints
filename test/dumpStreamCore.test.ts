import {describe, expect, it} from "vite-plus/test";
import {DumpChildScanner} from "../scripts/dumpStreamCore";

const dump =
{
	blueprints:
	{
		a:
		{
			title: 'tricky "quoted" } ] { [ , : \\',
			tags: ["/a/b/", "x,y"],
			favorites:
			{
				user: true,
			},
		},
		"b-_":
		{
			lastUpdatedDate: 1700000000002,
		},
	},
	skipped:
	{
		a:
		{
			title: "not wanted",
		},
	},
	thumbnails:
	{
		a: "data:image/png;base64,AAAA",
		"b-_": 'with "quotes" and \\ backslash',
	},
	version: 3,
	moderators:
	{
		someone: true,
		nobody: null,
	},
	empty: {},
};
const text = JSON.stringify(dump);

const scan = (chunks: string[]): [string, string, unknown][] =>
{
	const scanner = new DumpChildScanner(["blueprints", "thumbnails", "moderators", "empty", "version"]);
	return chunks.flatMap((chunk) => scanner.push(chunk)).map(([node, key, json]) => [node, key, JSON.parse(json)]);
};

const expected: [string, string, unknown][] = [
	["blueprints", "a", dump.blueprints.a],
	["blueprints", "b-_", dump.blueprints["b-_"]],
	["thumbnails", "a", dump.thumbnails.a],
	["thumbnails", "b-_", dump.thumbnails["b-_"]],
	["moderators", "someone", true],
	["moderators", "nobody", null],
];

describe("DumpChildScanner", () =>
{
	it("yields each child of the wanted top-level nodes as its own JSON text, in document order", () =>
	{
		expect(scan([text])).toStrictEqual(expected);
	});

	it("gives the same result wherever the chunks are split, and for pretty-printed input", () =>
	{
		for (let split = 0; split <= text.length; split++)
		{
			expect(scan([text.slice(0, split), text.slice(split)])).toStrictEqual(expected);
		}
		expect(scan([JSON.stringify(dump, null, "\t")])).toStrictEqual(expected);
	});
});
