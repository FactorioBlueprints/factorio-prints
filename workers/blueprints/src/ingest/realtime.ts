// Shapes of the Firebase Realtime Database nodes that ingest reads, as they appear in the daily dumps and in
// database events. Every field is optional because the database enforces none of them for old data.

export interface RealtimeImage
{
	id: string;
	type?: string | null;
	deletehash?: string | null;
	height?: number | null;
	width?: number | null;
}

/** `/blueprints/<key>`. */
export interface RealtimeBlueprint
{
	title?: string | null;
	blueprintString?: string | null;
	descriptionMarkdown?: string | null;
	/** An array, or an object keyed by array index, of tags like `/belt/balancer/`. */
	tags?: readonly string[] | Readonly<Record<string, string>> | null;
	image?: RealtimeImage | null;
	imageUrl?: string | null;
	author?:
	{
		userId?: string | null;
	} | null;
	authorId?: string | null;
	/** Epoch milliseconds. */
	createdDate?: number | null;
	lastUpdatedDate?: number | null;
	favorites?: Readonly<Record<string, boolean>> | null;
	numberOfFavorites?: number | null;
	fileName?: string | null;
	thumbnail?: string | null;
}

/** `/blueprintsPrivate/<key>`. */
export interface RealtimeBlueprintPrivate
{
	fileName?: string | null;
	imageUrl?: string | null;
	thumbnail?: string | null;
	deletehash?: string | null;
}

/** `/users/<uid>`. */
export interface RealtimeUser
{
	displayName?: string | null;
	providerDisplayName?: string | null;
	email?: string | null;
	emailVerified?: boolean | null;
	photoURL?: string | null;
	providerId?: string | null;
	favorites?: Readonly<Record<string, boolean>> | null;
	blueprints?: Readonly<Record<string, boolean>> | null;
	collection?: Readonly<Record<string, boolean>> | null;
}

/** `/comments/<blueprintKey>/<commentId>`. */
export interface RealtimeComment
{
	content?: string | null;
	/** Epoch milliseconds, as a number or a numeric string. */
	createdAt?: number | string | null;
	authorId?: string | null;
	parentId?: string | null;
	isDeleted?: boolean | null;
}

/** `/byTag/<category>/<name>/<blueprintKey>`. Older data stores some tags under one URL-encoded `category%2Fname` key. */
export type RealtimeByTag = Readonly<Record<string, Readonly<Record<string, unknown>>>>;

/** One user from a Firebase Auth export (`firebase auth:export`), or from the Admin SDK's `UserRecord`. */
export interface AuthUser
{
	localId: string;
	email?: string | null;
	displayName?: string | null;
	photoUrl?: string | null;
	providerUserInfo?:
		| readonly
		  {
				providerId: string;
		  }[]
		| null;
}
