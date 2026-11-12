import {and, count, eq, sql} from "drizzle-orm";
import {blueprint, blueprintVoteSummary, vote} from "./schema.ts";
import {SYSTEM_TO_SENTINEL} from "./temporal/columns.ts";
import {type AfterWrite, temporalTable} from "./temporal/temporal.ts";
import {REBUILD_VOTE_SUMMARY_STATEMENTS} from "./voteSummaryRebuild.ts";

// blueprint_vote_summary is a non-temporal cache with one row per current blueprint holding its number of current
// up votes. Every blueprint and vote write through the temporal module keeps it exact in the same atomic batch:
// phasing a blueprint in recounts its votes (zero for a new one, the surviving votes for a restored one), phasing it
// out deletes its row, and a vote changes the count only while its blueprint is current. Reads should still
// LEFT JOIN blueprint_vote_summary and use COALESCE(number_of_upvotes, 0), so a row missing for any reason reads as
// zero rather than hiding the blueprint.

const upvotes = (
	row:
		|
		  {
				direction?: string;
		  }
		| undefined,
) => (row?.direction === "up" ? 1 : 0);

/** Adds the change in a blueprint's up votes to its cached count, if the blueprint is current. */
const adjustVoteSummary: AfterWrite<typeof vote> = (db, before, after) =>
{
	const delta = upvotes(after) - upvotes(before);
	const blueprintKey = (after ?? before)?.blueprintKey;
	if (delta === 0 || blueprintKey === undefined)
	{
		return [];
	}
	// Selecting from the current blueprint row yields no row, and so no insert, when the blueprint is not current.
	const currentBlueprint = db
		.select(
			{
				key: blueprint.key,
				numberOfUpvotes: sql<number>`${delta}`.as("number_of_upvotes"),
			},
		)
		.from(blueprint)
		.where(and(eq(blueprint.key, blueprintKey), eq(blueprint.systemTo, SYSTEM_TO_SENTINEL)));
	return [
		db
			.insert(blueprintVoteSummary)
			.select(currentBlueprint)
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

/** Recounts a blueprint's current up votes when it is phased in, and drops its row when it is phased out. */
const maintainVoteSummaryRow: AfterWrite<typeof blueprint> = (db, before, after) =>
{
	if (before === undefined && after !== undefined)
	{
		const currentUpvotes = db
			.select(
				{
					key: sql<string>`${after.key}`.as("key"),
					numberOfUpvotes: count().as("number_of_upvotes"),
				},
			)
			.from(vote)
			.where(
				and(eq(vote.blueprintKey, after.key), eq(vote.direction, "up"), eq(vote.systemTo, SYSTEM_TO_SENTINEL)),
			);
		return [
			db
				.insert(blueprintVoteSummary)
				.select(currentUpvotes)
				.onConflictDoUpdate(
					{
						target: blueprintVoteSummary.key,
						set:
						{
							numberOfUpvotes: sql`excluded.number_of_upvotes`,
						},
					},
				),
		];
	}
	if (before !== undefined && after === undefined)
	{
		return [db.delete(blueprintVoteSummary).where(eq(blueprintVoteSummary.key, before.key))];
	}
	return [];
};

/** The blueprint table. Phasing a blueprint in or out keeps its blueprint_vote_summary row in step. */
export const blueprints = temporalTable(
	blueprint,
	["key"],
	{
		afterWrite: maintainVoteSummaryRow,
	},
);

/** The vote table. Every vote write adjusts the cached count of a current blueprint in the same batch. */
export const votes = temporalTable(
	vote,
	["userId", "blueprintKey"],
	{
		afterWrite: adjustVoteSummary,
	},
);

/** Recounts blueprint_vote_summary from the current blueprints and votes, for use after a bulk import. */
export const rebuildVoteSummary = async (database: D1Database): Promise<void> =>
{
	await database.batch(REBUILD_VOTE_SUMMARY_STATEMENTS.map((statement) => database.prepare(statement)));
};
