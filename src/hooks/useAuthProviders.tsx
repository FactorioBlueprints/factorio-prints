import {captureException} from "@sentry/react";
import {type QueryClient, useQueryClient} from "@tanstack/react-query";
import {FirebaseError} from "firebase/app";
import
{
	type AuthProvider,
	GithubAuthProvider,
	GoogleAuthProvider,
	getAdditionalUserInfo,
	getAuth,
	sendSignInLinkToEmail,
	signInWithPopup,
	type UserCredential,
} from "firebase/auth";
import {ref, runTransaction} from "firebase/database";
import {useCallback, useMemo, useState} from "react";
import {app} from "../base";
import {saveToStorage} from "../localStorage";
import {applyProviderUsername, type UserRecord} from "../utils/defaultDisplayName";
import {getFirebaseDatabase} from "../utils/firebaseDatabase";
import {userDisplayNameQueryKey, userNeedsDisplayNameQueryKey} from "./useUser";

export interface UseAuthProvidersReturn
{
	googleProvider: GoogleAuthProvider;
	githubProvider: GithubAuthProvider;
	authenticateWithProvider: (provider: AuthProvider) => Promise<void>;
	authenticateWithEmail: (email: string) => Promise<void>;
	authenticationError?: string;
	isEmailSending: boolean;
}

const ignoredProviderAuthenticationErrorCodes = new Set(["auth/cancelled-popup-request", "auth/popup-closed-by-user"]);

const expectedProviderAuthenticationErrorCodes = new Set(["auth/network-request-failed", "auth/popup-blocked"]);

const providerAuthenticationErrorMessages = new Map([
	["auth/account-exists-with-different-credential", "An account already exists with this email address."],
	["auth/network-request-failed", "Unable to reach the authentication service. Check your connection and try again."],
	["auth/operation-not-allowed", "This sign-in method is currently unavailable."],
	["auth/popup-blocked", "The sign-in popup was blocked. Allow popups for this site and try again."],
	["auth/unauthorized-domain", "Sign-in is not configured for this domain."],
]);

export const getProviderAuthenticationErrorMessage = (error: unknown): string =>
{
	if (error instanceof FirebaseError)
	{
		return providerAuthenticationErrorMessages.get(error.code) ?? "Unable to sign in. Please try again.";
	}
	return "Unable to sign in. Please try again.";
};

// A brand-new account defaults to the provider's real name. When the provider has no real name
// the account starts as "Anonymous"; if the provider exposes a username (GitHub login), use that instead.
const claimProviderUsername = async (credential: UserCredential, queryClient: QueryClient): Promise<void> =>
{
	const additionalUserInfo = getAdditionalUserInfo(credential);
	if (!additionalUserInfo?.isNewUser || !additionalUserInfo.username)
	{
		return;
	}
	const {username} = additionalUserInfo;
	try
	{
		const {uid} = credential.user;
		const userRef = ref(getFirebaseDatabase(), `/users/${uid}`);
		const {committed, snapshot} = await runTransaction(userRef, (existingUser: UserRecord | null) =>
			applyProviderUsername(existingUser, username, credential.user.displayName),
		);
		if (committed)
		{
			const userRecord: UserRecord | null = snapshot.val();
			queryClient.setQueryData(userDisplayNameQueryKey(uid), userRecord?.displayName ?? null);
			queryClient.setQueryData(userNeedsDisplayNameQueryKey(uid), userRecord?.needsDisplayName === true);
		}
	}
	catch (error)
	{
		// The user keeps the default name and can still choose a name on the account page
		console.log("Provider username claim skipped:", error instanceof Error ? error.message : "Unknown error");
	}
};

export const useAuthProviders = (onAuthSuccess?: () => void): UseAuthProvidersReturn =>
{
	const [isEmailSending, setIsEmailSending] = useState(false);
	const [authenticationError, setAuthenticationError] = useState<string>();
	const queryClient = useQueryClient();

	const googleProvider = useMemo(() =>
	{
		const provider = new GoogleAuthProvider();
		provider.setCustomParameters(
			{
				prompt: "consent select_account",
			},
		);
		return provider;
	}, []);

	const githubProvider = useMemo(() =>
	{
		const provider = new GithubAuthProvider();
		provider.setCustomParameters(
			{
				allow_signup: "true",
			},
		);
		return provider;
	}, []);

	const authenticateWithProvider = useCallback(
		async (provider: AuthProvider) =>
		{
			setAuthenticationError(undefined);
			try
			{
				const credential = await signInWithPopup(getAuth(app), provider);
				await claimProviderUsername(credential, queryClient);
				onAuthSuccess?.();
			}
			catch (error: unknown)
			{
				const authenticationErrorCode = error instanceof FirebaseError ? error.code : "unknown";
				if (ignoredProviderAuthenticationErrorCodes.has(authenticationErrorCode))
				{
					return;
				}

				setAuthenticationError(getProviderAuthenticationErrorMessage(error));
				if (expectedProviderAuthenticationErrorCodes.has(authenticationErrorCode))
				{
					return;
				}

				captureException(
					error,
					{
						tags:
						{
							component: "authentication",
							operation: "provider-sign-in",
						},
						extra:
						{
							authenticationErrorCode,
						},
					},
				);
			}
		},
		[onAuthSuccess, queryClient],
	);

	const authenticateWithEmail = useCallback(
		async (emailAddress: string) =>
		{
			if (!emailAddress.trim())
			{
				return;
			}

			setAuthenticationError(undefined);
			setIsEmailSending(true);

			const actionCodeSettings =
			{
				url: `${window.location.origin}/auth/email-callback`,
				handleCodeInApp: true,
			};

			try
			{
				await sendSignInLinkToEmail(getAuth(app), emailAddress, actionCodeSettings);
				saveToStorage("emailForSignIn", emailAddress);
				alert("Check your email for a sign-in link!");
				onAuthSuccess?.();
			}
			catch
			{
				alert("Failed to send sign-in email. Please try again.");
			}
			finally
			{
				setIsEmailSending(false);
			}
		},
		[onAuthSuccess],
	);

	return {
		googleProvider,
		githubProvider,
		authenticateWithProvider,
		authenticateWithEmail,
		authenticationError,
		isEmailSending,
	};
};
