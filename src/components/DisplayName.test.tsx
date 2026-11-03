import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {render, screen} from "@testing-library/react";
import {useAuthState} from "react-firebase-hooks/auth";
import {beforeEach, describe, expect, it, vi} from "vite-plus/test";
import DisplayName from "./DisplayName";

vi.mock("@fortawesome/react-fontawesome", () => (
{
	FontAwesomeIcon: () => <span aria-hidden="true" />,
}));

vi.mock("@tanstack/react-router", () => (
{
	Link: ({children}: {children: React.ReactNode}) => <a href="/user">{children}</a>,
}));

vi.mock("firebase/auth", () => (
{
	getAuth: vi.fn(() => ({})),
}));

vi.mock("react-firebase-hooks/auth", () => (
{
	useAuthState: vi.fn(),
}));

vi.mock("../base", () => (
{
	app: {},
}));

describe("DisplayName", () =>
{
	let queryClient: QueryClient;

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
		vi.mocked(useAuthState).mockReturnValue([null, false, undefined] as ReturnType<typeof useAuthState>);
	});

	it("shows a deleted user when the user record no longer exists", () =>
	{
		queryClient.setQueryData(["users", "userId", "gone", "displayName"], null);

		render(
			<QueryClientProvider client={queryClient}>
				<DisplayName userId="gone" withLink={false} />
			</QueryClientProvider>,
		);

		expect(screen.getByText("Deleted user").outerHTML).toBe('<span class="">Deleted user</span>');
	});

	it("shows the stored name for an existing user", () =>
	{
		queryClient.setQueryData(["users", "userId", "alice", "displayName"], "Alice");

		render(
			<QueryClientProvider client={queryClient}>
				<DisplayName userId="alice" withLink={false} />
			</QueryClientProvider>,
		);

		expect(screen.getByText("Alice").outerHTML).toBe('<span class="">Alice</span>');
	});
});
