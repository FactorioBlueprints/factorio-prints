import {sql} from "drizzle-orm";
import {blueprintVoteSummary, vote} from "./schema.ts";
import {type AfterWrite, temporalTable} from "./temporal/temporal.ts";
import {REBUILD_VOTE_SUMMARY_STATEMENTS} from "./voteSummaryRebuild.ts";

const upvotes = (
	row:
		|
		  {
				direction?: string;
		  }
		| undefined,
) => (row?.direction === "up" ? 1 : 0);

/** Adds the change in a blueprint's up votes to its cached count, creating the row if it is missing. */
const adjustVoteSummary: AfterWrite<typeof vote> = (db, before, after) =>
{
	const delta = upvotes(after) - upvotes(before);
	const blueprintKey = (after ?? before)?.blueprintKey;
	if (delta === 0 || blueprintKey === undefined)
	{
		return [];
	}
	return [
		db
			.insert(blueprintVoteSummary)
			.values(
				{
					key: blueprintKey,
					numberOfUpvotes: delta,
				},
			)
			.onConflictDoUpdate(
				{
					target: blueprintVoteSummary.key,
					set:
					{
						numberOfUpvotes: sql`${blueprintVoteSummary.numberOfUpvotes} + excluded.number_of_upvotes`,
					},
				},
			),
	];
};

/** The vote table. Every write through the temporal module keeps blueprint_vote_summary in step, atomically. */
export const votes = temporalTable(
	vote,
	["userId", "blueprintKey"],
	{
		afterWrite: adjustVoteSummary,
	},
);

/** Recounts blueprint_vote_summary from the current votes, for use after a bulk import. */
export const rebuildVoteSummary = async (database: D1Database): Promise<void> =>
{
	await database.batch(REBUILD_VOTE_SUMMARY_STATEMENTS.map((statement) => database.prepare(statement)));
};
