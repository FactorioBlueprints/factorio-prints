import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {useNavigate} from "@tanstack/react-router";
import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import {deleteUser, updateProfile} from "firebase/auth";
import {update} from "firebase/database";
import {useAuthState} from "react-firebase-hooks/auth";
import {beforeEach, describe, expect, it, vi} from "vite-plus/test";
import {anonymiseUserBlueprints, deleteUserBlueprints, reauthenticateAndDeleteUser} from "../api/accountDeletion";
import Account from "./Account";

vi.mock("@fortawesome/react-fontawesome", () => (
{
	FontAwesomeIcon: () => <span aria-hidden="true" />,
}));

vi.mock("@tanstack/react-router", () => (
{
	useNavigate: vi.fn(),
}));

vi.mock("firebase/auth", () => (
{
	getAuth: vi.fn(() => ({})),
	updateProfile: vi.fn(),
	deleteUser: vi.fn(),
}));

vi.mock("../api/accountDeletion", async (importOriginal) => (
{
	...(await importOriginal<typeof import("../api/accountDeletion")>()),
	anonymiseUserBlueprints: vi.fn(),
	deleteUserBlueprints: vi.fn(),
	reauthenticateAndDeleteUser: vi.fn(),
}));

vi.mock("firebase/database", () => (
{
	ref: vi.fn((_database: unknown, path: string) => (
	{
		path,
	})),
	update: vi.fn(),
}));

vi.mock("react-firebase-hooks/auth", () => (
{
	useAuthState: vi.fn(),
}));

vi.mock("../base", () => (
{
	app: {},
}));

vi.mock("../utils/firebaseDatabase", () => (
{
	getFirebaseDatabase: vi.fn(() => ({})),
}));

vi.mock("./PageHeader", () => (
{
	default: ({title}: {title: string}) => <h1>{title}</h1>,
}));

describe("Account", () =>
{
	let queryClient: QueryClient;
	let navigateMock: ReturnType<typeof vi.fn>;

	beforeEach(() =>
	{
		vi.clearAllMocks();
		queryClient = new QueryClient(
			{
				defaultOptions:
				{
					queries:
					{
						retry: false,
					},
					mutations:
					{
						retry: false,
					},
				},
			},
		);
		navigateMock = vi.fn();
		vi.mocked(useNavigate).mockReturnValue(navigateMock as unknown as ReturnType<typeof useNavigate>);
		vi.mocked(updateProfile).mockResolvedValue(undefined);
		vi.mocked(update).mockResolvedValue(undefined);
		vi.mocked(useAuthState).mockReturnValue([
			{
				uid: "alice",
				displayName: "Alice",
			},
			false,
			undefined,
		] as ReturnType<typeof useAuthState>);
	});

	it("writes the new display name into the user's displayName query after saving", async () =>
	{
		queryClient.setQueryData(["users", "userId", "alice", "displayName"], "Alice");
		queryClient.setQueryData(["users", "userId", "alice", "needsDisplayName"], true);

		render(
			<QueryClientProvider client={queryClient}>
				<Account />
			</QueryClientProvider>,
		);

		fireEvent.change(
			screen.getByPlaceholderText("DisplayName"),
			{
				target:
				{
					value: "Alice Renamed",
				},
			},
		);
		fireEvent.click(
			screen.getByRole(
				"button",
				{
					name: "Save",
				},
			),
		);

		await waitFor(() => expect(navigateMock).toHaveBeenCalled());

		expect(
			{
				cachedDisplayName: queryClient.getQueryData(["users", "userId", "alice", "displayName"]),
				cachedNeedsDisplayName: queryClient.getQueryData(["users", "userId", "alice", "needsDisplayName"]),
				updateCalls: vi.mocked(update).mock.calls,
				navigateCalls: navigateMock.mock.calls,
			},
		).toStrictEqual(
			{
				cachedDisplayName: "Alice Renamed",
				cachedNeedsDisplayName: false,
				updateCalls: [
					[
						{
							path: "/users/alice",
						},
						{
							displayName: "Alice Renamed",
							needsDisplayName: null,
						},
					],
				],
				navigateCalls: [
					[
						{
							to: "/user/$userId",
							params:
							{
								userId: "alice",
							},
						},
					],
				],
			},
		);
	});

	const renderAccount = () =>
		render(
			<QueryClientProvider client={queryClient}>
				<Account />
			</QueryClientProvider>,
		);

	it("never pre-fills the provider's real name for a new account with the default name", () =>
	{
		vi.mocked(useAuthState).mockReturnValue([
			{
				uid: "alice",
				displayName: "Real Name",
			},
			false,
			undefined,
		] as ReturnType<typeof useAuthState>);
		queryClient.setQueryData(["users", "userId", "alice", "displayName"], "Anonymous");
		queryClient.setQueryData(["users", "userId", "alice", "needsDisplayName"], true);

		renderAccount();

		expect(screen.getByPlaceholderText("DisplayName")).toHaveProperty("value", "");
	});

	it("pre-fills the stored display name rather than the provider's real name", () =>
	{
		vi.mocked(useAuthState).mockReturnValue([
			{
				uid: "alice",
				displayName: "Real Name",
			},
			false,
			undefined,
		] as ReturnType<typeof useAuthState>);
		queryClient.setQueryData(["users", "userId", "alice", "displayName"], "alice-gh");
		queryClient.setQueryData(["users", "userId", "alice", "needsDisplayName"], true);

		renderAccount();

		expect(screen.getByPlaceholderText("DisplayName")).toHaveProperty("value", "alice-gh");
	});

	describe("account deletion", () =>
	{
		const user =
		{
			uid: "alice",
			displayName: "Alice",
			providerData: [],
		};

		beforeEach(() =>
		{
			vi.mocked(useAuthState).mockReturnValue([user, false, undefined] as unknown as ReturnType<
				typeof useAuthState
			>);
			queryClient.setQueryData(["users", "userId", "alice", "displayName"], "Alice");
			queryClient.setQueryData(["users", "userId", "alice", "needsDisplayName"], false);
			vi.mocked(anonymiseUserBlueprints).mockResolvedValue(undefined);
			vi.mocked(deleteUserBlueprints).mockResolvedValue(undefined);
			vi.mocked(deleteUser).mockResolvedValue(undefined);
			vi.mocked(reauthenticateAndDeleteUser).mockResolvedValue(undefined);
		});

		const confirmDeletion = (choiceLabel: RegExp) =>
		{
			fireEvent.click(
				screen.getByRole(
					"button",
					{
						name: "Delete account...",
					},
				),
			);
			fireEvent.click(screen.getByLabelText(choiceLabel));
			fireEvent.click(
				screen.getByRole(
					"button",
					{
						name: "Delete my account",
					},
				),
			);
		};

		it("cannot confirm deletion before choosing what happens to the blueprints", () =>
		{
			renderAccount();

			fireEvent.click(
				screen.getByRole(
					"button",
					{
						name: "Delete account...",
					},
				),
			);

			expect(
				screen.getByRole(
					"button",
					{
						name: "Delete my account",
					},
				),
			).toHaveProperty("disabled", true);
		});

		it("anonymises the blueprints and then deletes the account when keeping blueprints", async () =>
		{
			renderAccount();

			confirmDeletion(/Keep my blueprints/);

			await waitFor(() => expect(navigateMock).toHaveBeenCalled());

			expect(
				{
					anonymise: vi.mocked(anonymiseUserBlueprints).mock.calls,
					deleteBlueprints: vi.mocked(deleteUserBlueprints).mock.calls,
					deleteUser: vi.mocked(deleteUser).mock.calls,
					anonymisedBeforeDeletingUser:
						vi.mocked(anonymiseUserBlueprints).mock.invocationCallOrder[0] <
						vi.mocked(deleteUser).mock.invocationCallOrder[0],
					navigate: navigateMock.mock.calls,
				},
			).toStrictEqual(
				{
					anonymise: [["alice"]],
					deleteBlueprints: [],
					deleteUser: [[user]],
					anonymisedBeforeDeletingUser: true,
					navigate: [
						[
							{
								to: "/",
							},
						],
					],
				},
			);
		});

		it("deletes the blueprints and then deletes the account when deleting blueprints", async () =>
		{
			renderAccount();

			confirmDeletion(/Delete my blueprints/);

			await waitFor(() => expect(navigateMock).toHaveBeenCalled());

			expect(
				{
					anonymise: vi.mocked(anonymiseUserBlueprints).mock.calls,
					deleteBlueprints: vi.mocked(deleteUserBlueprints).mock.calls,
					deleteUser: vi.mocked(deleteUser).mock.calls,
					blueprintsDeletedBeforeDeletingUser:
						vi.mocked(deleteUserBlueprints).mock.invocationCallOrder[0] <
						vi.mocked(deleteUser).mock.invocationCallOrder[0],
					navigate: navigateMock.mock.calls,
				},
			).toStrictEqual(
				{
					anonymise: [],
					deleteBlueprints: [["alice"]],
					deleteUser: [[user]],
					blueprintsDeletedBeforeDeletingUser: true,
					navigate: [
						[
							{
								to: "/",
							},
						],
					],
				},
			);
		});

		it("asks the user to sign in again when deletion requires a recent login, then retries", async () =>
		{
			vi.mocked(deleteUser).mockRejectedValue(
				Object.assign(
					new Error("requires recent login"),
					{
						code: "auth/requires-recent-login",
					},
				),
			);
			renderAccount();

			confirmDeletion(/Keep my blueprints/);

			fireEvent.click(
				await screen.findByRole(
					"button",
					{
						name: "Sign in again and delete",
					},
				),
			);

			await waitFor(() => expect(navigateMock).toHaveBeenCalled());

			expect(
				{
					deleteUser: vi.mocked(deleteUser).mock.calls,
					reauthenticateAndDelete: vi.mocked(reauthenticateAndDeleteUser).mock.calls,
					navigate: navigateMock.mock.calls,
				},
			).toStrictEqual(
				{
					deleteUser: [[user]],
					reauthenticateAndDelete: [[user]],
					navigate: [
						[
							{
								to: "/",
							},
						],
					],
				},
			);
		});
	});
});
