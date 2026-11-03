import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {act, fireEvent, render, renderHook, screen} from "@testing-library/react";
import {FirebaseError} from "firebase/app";
import type React from "react";
import {beforeEach, describe, expect, it, vi} from "vite-plus/test";
import {getProviderAuthenticationErrorMessage, useAuthProviders} from "../../hooks/useAuthProviders";
import {AuthenticationForm} from "./AuthenticationForm";

const authenticationMocks = vi.hoisted(() => (
{
	auth: {},
	captureException: vi.fn(),
	getAdditionalUserInfo: vi.fn(),
	ref: vi.fn((_database: unknown, path: string) => (
	{
		path,
	})),
	runTransaction: vi.fn(),
	signInWithPopup: vi.fn(),
}));

vi.mock("firebase/database", () => (
{
	ref: authenticationMocks.ref,
	runTransaction: authenticationMocks.runTransaction,
}));

vi.mock("../../utils/firebaseDatabase", () => (
{
	getFirebaseDatabase: vi.fn(() => ({})),
}));

vi.mock("@sentry/react", () => (
{
	captureException: authenticationMocks.captureException,
}));

vi.mock("firebase/auth", async (importOriginal) =>
{
	const original = await importOriginal<typeof import("firebase/auth")>();
	return {
		...original,
		getAdditionalUserInfo: authenticationMocks.getAdditionalUserInfo,
		getAuth: vi.fn(() => authenticationMocks.auth),
		signInWithPopup: authenticationMocks.signInWithPopup,
	};
});

describe("AuthenticationForm", () =>
{
	let queryClient: QueryClient;
	const wrapper = ({children}: {children: React.ReactNode}) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	beforeEach(() =>
	{
		queryClient = new QueryClient(
			{
				defaultOptions:
				{
					queries:
					{
						retry: false,
					},
				},
			},
		);
		authenticationMocks.captureException.mockReset();
		authenticationMocks.signInWithPopup.mockReset();
		authenticationMocks.getAdditionalUserInfo.mockReset();
		authenticationMocks.runTransaction.mockReset();
		authenticationMocks.runTransaction.mockResolvedValue(
			{
				committed: true,
			},
		);
	});

	it("maps provider failures to actionable messages", () =>
	{
		expect([
			getProviderAuthenticationErrorMessage(
				new FirebaseError("auth/account-exists-with-different-credential", "Account conflict"),
			),
			getProviderAuthenticationErrorMessage(new FirebaseError("auth/network-request-failed", "Network failure")),
			getProviderAuthenticationErrorMessage(new FirebaseError("auth/operation-not-allowed", "Provider disabled")),
			getProviderAuthenticationErrorMessage(new FirebaseError("auth/popup-blocked", "Popup blocked")),
			getProviderAuthenticationErrorMessage(new FirebaseError("auth/unauthorized-domain", "Unauthorized domain")),
			getProviderAuthenticationErrorMessage(new FirebaseError("auth/internal-error", "Unexpected failure")),
			getProviderAuthenticationErrorMessage(new Error("Non-Firebase failure")),
		]).toStrictEqual([
			"An account already exists with this email address.",
			"Unable to reach the authentication service. Check your connection and try again.",
			"This sign-in method is currently unavailable.",
			"The sign-in popup was blocked. Allow popups for this site and try again.",
			"Sign-in is not configured for this domain.",
			"Unable to sign in. Please try again.",
			"Unable to sign in. Please try again.",
		]);
	});

	it("shows popup-blocked failures without reporting them", async () =>
	{
		const authenticationError = new FirebaseError("auth/popup-blocked", "Popup blocked");
		const onAuthSuccess = vi.fn();
		authenticationMocks.signInWithPopup.mockRejectedValue(authenticationError);
		render(
			<AuthenticationForm onAuthSuccess={onAuthSuccess} />,
			{
				wrapper,
			},
		);

		fireEvent.click(
			screen.getByRole(
				"button",
				{
					name: /Log in with Google$/,
				},
			),
		);

		const alert = await screen.findByRole("alert");
		expect(
			{
				alertText: alert.textContent,
				captureExceptionCalls: authenticationMocks.captureException.mock.calls,
				onAuthSuccessCalls: onAuthSuccess.mock.calls,
			},
		).toStrictEqual(
			{
				alertText: "The sign-in popup was blocked. Allow popups for this site and try again.",
				captureExceptionCalls: [],
				onAuthSuccessCalls: [],
			},
		);
	});

	it.each([
		["auth/popup-closed-by-user", "Popup closed"],
		["auth/cancelled-popup-request", "Popup cancelled"],
	])("keeps %s failures silent", async (errorCode, errorMessage) =>
	{
		authenticationMocks.signInWithPopup.mockRejectedValue(new FirebaseError(errorCode, errorMessage));
		const {result} = renderHook(
			() => useAuthProviders(),
			{
				wrapper,
			},
		);

		await act(() => result.current.authenticateWithProvider(result.current.googleProvider));

		expect(
			{
				authenticationError: result.current.authenticationError,
				captureExceptionCalls: authenticationMocks.captureException.mock.calls,
			},
		).toStrictEqual(
			{
				authenticationError: undefined,
				captureExceptionCalls: [],
			},
		);
	});

	it("shows network failures without reporting them", async () =>
	{
		authenticationMocks.signInWithPopup.mockRejectedValue(
			new FirebaseError("auth/network-request-failed", "Network failure"),
		);
		const {result} = renderHook(
			() => useAuthProviders(),
			{
				wrapper,
			},
		);

		await act(() => result.current.authenticateWithProvider(result.current.githubProvider));

		expect(
			{
				authenticationError: result.current.authenticationError,
				captureExceptionCalls: authenticationMocks.captureException.mock.calls,
			},
		).toStrictEqual(
			{
				authenticationError: "Unable to reach the authentication service. Check your connection and try again.",
				captureExceptionCalls: [],
			},
		);
	});

	it("shows and reports unexpected provider failures", async () =>
	{
		const authenticationError = new FirebaseError("auth/internal-error", "Unexpected failure");
		authenticationMocks.signInWithPopup.mockRejectedValue(authenticationError);
		const {result} = renderHook(
			() => useAuthProviders(),
			{
				wrapper,
			},
		);

		await act(() => result.current.authenticateWithProvider(result.current.googleProvider));

		expect(
			{
				authenticationError: result.current.authenticationError,
				captureExceptionCalls: authenticationMocks.captureException.mock.calls,
			},
		).toStrictEqual(
			{
				authenticationError: "Unable to sign in. Please try again.",
				captureExceptionCalls: [
					[
						authenticationError,
						{
							tags:
							{
								component: "authentication",
								operation: "provider-sign-in",
							},
							extra:
							{
								authenticationErrorCode: "auth/internal-error",
							},
						},
					],
				],
			},
		);
	});

	it("calls the success handler after provider authentication", async () =>
	{
		const onAuthSuccess = vi.fn();
		authenticationMocks.signInWithPopup.mockResolvedValue({});
		const {result} = renderHook(
			() => useAuthProviders(onAuthSuccess),
			{
				wrapper,
			},
		);

		await act(() => result.current.authenticateWithProvider(result.current.githubProvider));

		expect(
			{
				authenticationError: result.current.authenticationError,
				onAuthSuccessCalls: onAuthSuccess.mock.calls,
			},
		).toStrictEqual(
			{
				authenticationError: undefined,
				onAuthSuccessCalls: [[]],
			},
		);
	});

	it("defaults a new GitHub user's display name to their real name, replacing Anonymous with their login", async () =>
	{
		const credential =
		{
			user:
			{
				uid: "alice",
				displayName: "Alice Realname",
			},
		};
		authenticationMocks.signInWithPopup.mockResolvedValue(credential);
		authenticationMocks.getAdditionalUserInfo.mockReturnValue(
			{
				isNewUser: true,
				providerId: "github.com",
				profile:
				{
					name: "Alice Realname",
					login: "alice-gh",
				},
				username: "alice-gh",
			},
		);
		const {result} = renderHook(
			() => useAuthProviders(),
			{
				wrapper,
			},
		);

		await act(() => result.current.authenticateWithProvider(result.current.githubProvider));

		const [[userRef, updateUser]] = authenticationMocks.runTransaction.mock.calls;
		expect(
			{
				userRef,
				newRecord: updateUser(null),
				anonymousRecord: updateUser(
					{
						displayName: "Anonymous",
						needsDisplayName: true,
					},
				),
			},
		).toStrictEqual(
			{
				userRef:
				{
					path: "/users/alice",
				},
				newRecord:
				{
					displayName: "Alice Realname",
					needsDisplayName: true,
				},
				anonymousRecord:
				{
					displayName: "alice-gh",
					needsDisplayName: true,
				},
			},
		);
	});

	it("does not touch the display name of a returning user", async () =>
	{
		authenticationMocks.signInWithPopup.mockResolvedValue(
			{
				user:
				{
					uid: "alice",
				},
			},
		);
		authenticationMocks.getAdditionalUserInfo.mockReturnValue(
			{
				isNewUser: false,
				providerId: "github.com",
				profile: {},
				username: "alice-gh",
			},
		);
		const {result} = renderHook(
			() => useAuthProviders(),
			{
				wrapper,
			},
		);

		await act(() => result.current.authenticateWithProvider(result.current.githubProvider));

		expect(authenticationMocks.runTransaction.mock.calls).toStrictEqual([]);
	});

	it("updates the cached display name after applying a new GitHub user's login", async () =>
	{
		queryClient.setQueryData(["users", "userId", "alice", "displayName"], "Anonymous");
		queryClient.setQueryData(["users", "userId", "alice", "needsDisplayName"], true);
		authenticationMocks.signInWithPopup.mockResolvedValue(
			{
				user:
				{
					uid: "alice",
				},
			},
		);
		authenticationMocks.getAdditionalUserInfo.mockReturnValue(
			{
				isNewUser: true,
				providerId: "github.com",
				profile: {},
				username: "alice-gh",
			},
		);
		authenticationMocks.runTransaction.mockResolvedValue(
			{
				committed: true,
				snapshot:
				{
					val: () => (
					{
						displayName: "alice-gh",
						needsDisplayName: true,
					}),
				},
			},
		);
		const {result} = renderHook(
			() => useAuthProviders(),
			{
				wrapper,
			},
		);

		await act(() => result.current.authenticateWithProvider(result.current.githubProvider));

		expect(
			{
				cachedDisplayName: queryClient.getQueryData(["users", "userId", "alice", "displayName"]),
				cachedNeedsDisplayName: queryClient.getQueryData(["users", "userId", "alice", "needsDisplayName"]),
			},
		).toStrictEqual(
			{
				cachedDisplayName: "alice-gh",
				cachedNeedsDisplayName: true,
			},
		);
	});
});
