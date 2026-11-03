export const DEFAULT_DISPLAY_NAME = "Anonymous";

export interface UserRecord
{
	displayName?: string | null;
	needsDisplayName?: boolean;
	[key: string]: unknown;
}

export interface SignInProfile
{
	providerDisplayName: string | null | undefined;
	photoURL: string | null;
	email: string | null;
	emailVerified: boolean;
	providerId: string | null | undefined;
}

/**
 * The public display name for a new account: the sign-in provider's real name, else the
 * provider username (e.g. GitHub login), else a neutral default. The user is prompted to
 * confirm or change it.
 */
export function getDefaultDisplayName(providerDisplayName: string | null | undefined, username?: string | null): string
{
	return providerDisplayName?.trim() || username?.trim() || DEFAULT_DISPLAY_NAME;
}

/**
 * Transaction update for /users/{uid} on every auth state change. Refreshes the private
 * provider fields; a record without a display name gets the default name and a prompt.
 */
export function buildUserInformation(existingUser: UserRecord | null, profile: SignInProfile): UserRecord
{
	return {
		...existingUser,
		...(existingUser?.displayName
			? {}
			:
				{
					displayName: getDefaultDisplayName(profile.providerDisplayName),
					needsDisplayName: true,
				}),
		...profile,
	};
}

/**
 * Transaction update for /users/{uid} after a brand-new sign-in that exposed a provider
 * username. Replaces only the neutral default, which means the provider had no real name;
 * returns undefined to abort otherwise.
 */
export function applyProviderUsername(
	existingUser: UserRecord | null,
	username: string | null | undefined,
	providerDisplayName: string | null | undefined,
): UserRecord | undefined
{
	const trimmedUsername = username?.trim();
	if (!trimmedUsername)
	{
		return undefined;
	}
	if (existingUser === null)
	{
		return {
			displayName: getDefaultDisplayName(providerDisplayName, trimmedUsername),
			needsDisplayName: true,
		};
	}
	if (existingUser.needsDisplayName !== true || existingUser.displayName !== DEFAULT_DISPLAY_NAME)
	{
		return undefined;
	}
	return {
		...existingUser,
		displayName: trimmedUsername,
	};
}
