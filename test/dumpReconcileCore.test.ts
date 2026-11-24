import {describe, expect, it} from "vite-plus/test";
import {rederiveAll} from "../scripts/dumpReconcileCore";

describe("rederiveAll", () =>
{
	it("asks for page after page until the strings are exhausted, and adds up what changed", async () =>
	{
		const requests: unknown[] = [];
		const pages = [
			{
				checked: 2,
				next: "b",
				missing: [],
				changed: [
					{
						sha: "a",
						tables: ["blueprint_game_data_icon"],
					},
				],
			},
			{
				checked: 2,
				next: "d",
				missing: ["c"],
				changed: [
					{
						sha: "d",
						tables: ["blueprint_game_data", "blueprint_game_data_icon"],
					},
				],
			},
			{
				checked: 1,
				next: null,
				missing: [],
				changed: [],
			},
		];

		const report = await rederiveAll(
			{
				mode: "repair",
				pageSize: 2,
				send: async (request) =>
				{
					requests.push(request);
					return {
						rederive: pages[requests.length - 1],
					};
				},
			},
		);

		expect(
			{
				requests,
				report,
			},
		).toStrictEqual(
			{
				requests: ["", "b", "d"].map((after) => (
				{
					mode: "repair",
					events: [],
					rederive:
					{
						after,
						limit: 2,
					},
				})),
				report:
				{
					checked: 5,
					changedStrings: 2,
					changedTables:
					{
						blueprint_game_data_icon: 2,
						blueprint_game_data: 1,
					},
					missing: ["c"],
				},
			},
		);
	});
});
