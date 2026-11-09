import {env} from "cloudflare:workers";
import {describe, expect, it} from "vite-plus/test";

describe("blueprint_vote_summary index", () =>
{
	it("serves the most-favorited listing from an index, without a sort step", async () =>
	{
		const plan = await env.DB.prepare(
			"EXPLAIN QUERY PLAN SELECT key FROM blueprint_vote_summary ORDER BY number_of_upvotes DESC, key DESC LIMIT 60",
		).all<
		{
			detail: string;
		}>();

		expect(plan.results.map((row) => row.detail)).toEqual([
			"SCAN blueprint_vote_summary USING COVERING INDEX blueprint_vote_summary_idx_number_of_upvotes",
		]);
	});
});
