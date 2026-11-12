/**
 * Pure helpers for listing Firebase Auth accounts with only the fields the blueprint store needs.
 * The runner in exportAuthUsers.ts does the credential, network and file IO.
 */

export interface AuthExportUser
{
	uid: string;
	email: string | null;
	photoURL: string | null;
	providerIds: string[];
	disabled: boolean;
}

export interface AuthExport
{
	/** When the listing was taken, in epoch milliseconds. */
	exportedAt: number;
	users: AuthExportUser[];
}

// The response is limited to these fields by the service itself, so nothing else, password hashes and salts
// included, is ever sent.
const FIELDS = "nextPageToken,users(localId,email,photoUrl,disabled,providerUserInfo(providerId))";
const PAGE_SIZE = 1000;

/** The Identity Toolkit request for one page of a project's accounts. */
export const authListUrl = (projectId: string, pageToken?: string): string =>
{
	const url = new URL(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:batchGet`);
	url.searchParams.set("maxResults", String(PAGE_SIZE));
	if (pageToken !== undefined)
	{
		url.searchParams.set("nextPageToken", pageToken);
	}
	url.searchParams.set("fields", FIELDS);
	return url.href;
};

/** Picks the kept fields out of one account of the response, whatever else it holds. */
export const toAuthExportUser = (account: Record<string, unknown>): AuthExportUser =>
{
	const providers = Array.isArray(account.providerUserInfo)
		? (account.providerUserInfo as Record<string, unknown>[])
		: [];
	return {
		uid: String(account.localId),
		email: typeof account.email === "string" ? account.email : null,
		photoURL: typeof account.photoUrl === "string" ? account.photoUrl : null,
		providerIds: providers
			.map((provider) => provider.providerId)
			.filter((id): id is string => typeof id === "string"),
		disabled: account.disabled === true,
	};
};
