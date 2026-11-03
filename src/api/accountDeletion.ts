import
{
	type AuthProvider,
	deleteUser,
	GithubAuthProvider,
	GoogleAuthProvider,
	reauthenticateWithPopup,
	type User,
} from "firebase/auth";
import {update as dbUpdate, get, ref} from "firebase/database";
import {getFirebaseDatabase} from "../utils/firebaseDatabase";

export interface DeleteBlueprintDataParams
{
	id: string;
	authorId: string;
	tags: string[];
}

// The owner/moderator delete path, shared by the edit page and account deletion
export const deleteBlueprintData = async ({id, authorId, tags}: DeleteBlueprintDataParams) =>
{
	// Phase 1: Shrink the blueprint by removing the large blueprintString field.
	// This prevents TRIGGER_PAYLOAD_TOO_LARGE errors when the Cloud Function
	// receives the deleted blueprint data.
	await dbUpdate(
		ref(getFirebaseDatabase()),
		{
			[`/blueprints/${id}/blueprintString`]: null,
		},
	);

	// Phase 2: Delete the blueprint and all related data.
	// The Cloud Function cleanupFavoritesOnBlueprintDelete will also run
	// as a safety net for favorites cleanup.
	const updates: Record<string, null> =
	{
		[`/blueprints/${id}`]: null,
		[`/users/${authorId}/blueprints/${id}`]: null,
		[`/users/${authorId}/collection/${id}`]: null,
		[`/blueprintSummaries/${id}`]: null,
	};

	tags.forEach((tag) =>
	{
		updates[`/byTag/${tag}/${id}`] = null;
	});

	await dbUpdate(ref(getFirebaseDatabase()), updates);
};

// Unlike fetchUserBlueprints, errors propagate so a failed read never deletes the account
const getUserBlueprintIds = async (userId: string): Promise<string[]> =>
{
	const snapshot = await get(ref(getFirebaseDatabase(), `/users/${userId}/blueprints`));
	return Object.keys(snapshot.val() || {});
};

export const deleteUserBlueprints = async (userId: string) =>
{
	for (const id of await getUserBlueprintIds(userId))
	{
		const tagsSnapshot = await get(ref(getFirebaseDatabase(), `/blueprints/${id}/tags`));
		const tags: string[] = tagsSnapshot.val() || [];
		await deleteBlueprintData(
			{
				id,
				authorId: userId,
				tags,
			},
		);
	}
};

// Keeps the blueprints but leaves no name on them; author.userId stays so they're identifiable as orphaned
export const anonymiseUserBlueprints = async (userId: string) =>
{
	const updates: Record<string, null> = {};
	for (const id of await getUserBlueprintIds(userId))
	{
		updates[`/blueprints/${id}/author/displayName`] = null;
	}

	if (Object.keys(updates).length > 0)
	{
		await dbUpdate(ref(getFirebaseDatabase()), updates);
	}
};

export const isRequiresRecentLoginError = (error: unknown) =>
	(
		error as
		{
			code?: string;
		} | null
	)?.code === "auth/requires-recent-login";

const reauthenticationProvider = (user: User): AuthProvider | null =>
{
	const providerIds = user.providerData.map((provider) => provider.providerId);
	if (providerIds.includes("google.com"))
	{
		return new GoogleAuthProvider();
	}
	if (providerIds.includes("github.com"))
	{
		return new GithubAuthProvider();
	}
	return null;
};

export const reauthenticateAndDeleteUser = async (user: User) =>
{
	const provider = reauthenticationProvider(user);
	if (!provider)
	{
		throw new Error("Sign out and sign back in, then try deleting your account again.");
	}

	await reauthenticateWithPopup(user, provider);
	await deleteUser(user);
};
