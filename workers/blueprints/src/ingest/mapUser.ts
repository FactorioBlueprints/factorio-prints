// Port of the reference converter's user mapping: profiles merged with Firebase Auth records, favorites, and
// collections.
import type {AuthUser, RealtimeUser} from "./realtime.ts";
import type {BlueprintCollectionEntryRow, FirebaseUserRow, UserEntitlementRow, VoteRow} from "./rows.ts";

const MAX_DISPLAY_NAME_LENGTH = 256;
const DELETED_ACCOUNT = "deleted account";

/**
 * Overlays a Firebase Auth record on `/users/<uid>`, as the converter does with the daily auth export. A user
 * missing from the export has deleted their account: the profile becomes "deleted account" and their favorites and
 * collection are dropped. The Realtime email and provider display name win when present; the photo URL and provider
 * id always come from Auth.
 */
export const applyAuth = (user: RealtimeUser, authUser: AuthUser | undefined): RealtimeUser =>
{
	if (authUser === undefined)
	{
		return {
			displayName: DELETED_ACCOUNT,
			providerDisplayName: DELETED_ACCOUNT,
			email: DELETED_ACCOUNT,
			emailVerified: user.emailVerified,
			photoURL: DELETED_ACCOUNT,
			providerId: user.providerId,
			favorites: {},
			blueprints: user.blueprints,
			collection: {},
		};
	}

	return {
		displayName: user.displayName,
		providerDisplayName: user.providerDisplayName ?? authUser.displayName,
		email: user.email ?? authUser.email,
		emailVerified: user.emailVerified,
		photoURL: authUser.photoUrl,
		providerId: authUser.providerUserInfo?.[0]?.providerId ?? user.providerId,
		favorites: user.favorites,
		blueprints: user.blueprints,
		collection: user.collection,
	};
};

const mapDisplayName = (displayName: string | null | undefined) =>
{
	if (displayName === null || displayName === undefined || displayName === "")
	{
		return "Anonymous";
	}
	return displayName.length > MAX_DISPLAY_NAME_LENGTH ? displayName.slice(0, MAX_DISPLAY_NAME_LENGTH) : displayName;
};

/** Maps `/users/<uid>` (after {@link applyAuth}, when an auth record is available) to its `firebase_user` row. */
export const mapUser = (userId: string, user: RealtimeUser): FirebaseUserRow => (
{
	userId,
	displayName: mapDisplayName(user.displayName),
	providerDisplayName: user.providerDisplayName ?? null,
	email: user.email ?? null,
	emailVerified: user.emailVerified === true,
	photoURL: user.photoURL ?? null,
	providerId: user.providerId ?? null,
});

export interface FavoritesContext
{
	/** The author of every blueprint that exists, by blueprint key. */
	blueprintAuthors: ReadonlyMap<string, string>;
}

/**
 * Maps `/users/<uid>/favorites` to up-votes. `/blueprints/<key>/favorites` is a reverse index and is ignored.
 * Favorites of missing blueprints, `false` entries and favorites of one's own blueprint are skipped.
 */
export const mapFavorites = (userId: string, user: RealtimeUser, context: FavoritesContext): VoteRow[] =>
	Object.entries(user.favorites ?? {})
		.filter(([blueprintKey, favorited]) =>
		{
			const author = context.blueprintAuthors.get(blueprintKey);
			return author !== undefined && favorited === true && author !== userId;
		})
		.map(([blueprintKey]) => (
		{
			userId,
			blueprintKey,
			direction: "up" as const,
		}));

/**
 * Maps `/users/<uid>/collection`, the source of truth, to collection entries. `/blueprintCollectors` is a reverse
 * index and is ignored. Entries for missing blueprints and `false` entries are skipped.
 */
export const mapCollections = (
	userId: string,
	user: RealtimeUser,
	context:
	{
		blueprintKeys: ReadonlySet<string>;
	},
): BlueprintCollectionEntryRow[] =>
	Object.entries(user.collection ?? {})
		.filter(([blueprintKey, collected]) => context.blueprintKeys.has(blueprintKey) && collected === true)
		.map(([blueprintKey]) => (
		{
			userId,
			blueprintKey,
		}));

/**
 * Maps `/moderators` to administrator entitlements: the same two administrators that factorio.school's history
 * holds.
 */
export const mapModerators = (moderators: Readonly<Record<string, boolean>> | null | undefined): UserEntitlementRow[] =>
	Object.entries(moderators ?? {})
		.filter(([, isModerator]) => isModerator === true)
		.map(([userId]) => (
		{
			userId,
			userRole: "administrator" as const,
		}));
