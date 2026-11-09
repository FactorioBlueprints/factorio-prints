// Dependency-free so the Node history importer can run the same statements against SQLite.

/**
 * Rebuilds the blueprint_vote_summary cache from scratch: one row per current blueprint, counting its current up
 * votes. Run the statements in one transaction.
 */
export const REBUILD_VOTE_SUMMARY_STATEMENTS = [
	"DELETE FROM blueprint_vote_summary",
	`INSERT INTO blueprint_vote_summary (key, number_of_upvotes)
	SELECT blueprint.key, (
		SELECT count(*) FROM vote
		WHERE vote.blueprint_key = blueprint.key
			AND vote.direction = 'up'
			AND vote.system_to = 253402300799999
	)
	FROM blueprint
	WHERE blueprint.system_to = 253402300799999`,
];
