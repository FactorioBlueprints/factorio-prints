interface DeletedUserData
{
	favorites?: Record<string, unknown>;
	collection?: Record<string, unknown>;
	blueprints?: Record<string, unknown>;
}

/**
 * Builds the multi-path update that removes a deleted user from favorites and collectors,
 * clears any author name left on their remaining (orphaned) blueprints, and deletes their record.
 * author.userId stays so orphaned blueprints can still be identified.
 */
export const buildUserDeleteCleanupUpdates = (userId: string, userData: DeletedUserData): Record<string, null> =>
{
	const updates: Record<string, null> = {};

	for (const blueprintId of Object.keys(userData.favorites || {}))
	{
		updates[`/blueprints/${blueprintId}/favorites/${userId}`] = null;
	}

	for (const blueprintId of Object.keys(userData.collection || {}))
	{
		updates[`/blueprintCollectors/${blueprintId}/${userId}`] = null;
	}

	for (const blueprintId of Object.keys(userData.blueprints || {}))
	{
		updates[`/blueprints/${blueprintId}/author/displayName`] = null;
	}

	updates[`/users/${userId}`] = null;

	return updates;
};
