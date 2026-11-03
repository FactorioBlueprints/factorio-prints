import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {useNavigate} from "@tanstack/react-router";
import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import {updateProfile} from "firebase/auth";
import {update} from "firebase/database";
import {useAuthState} from "react-firebase-hooks/auth";
import {beforeEach, describe, expect, it, vi} from "vite-plus/test";
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
});
