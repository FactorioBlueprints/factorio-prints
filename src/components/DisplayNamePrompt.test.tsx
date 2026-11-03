import {render} from "@testing-library/react";
import type React from "react";
import {useAuthState} from "react-firebase-hooks/auth";
import {beforeEach, describe, expect, it, vi} from "vite-plus/test";
import {useUserNeedsDisplayName} from "../hooks/useUser";
import DisplayNamePrompt from "./DisplayNamePrompt";

const routerMocks = vi.hoisted(() => (
{
	pathname: "/",
}));

vi.mock("@tanstack/react-router", () => (
{
	Link: ({
		children,
		to,
		...anchorProps
	}: React.AnchorHTMLAttributes<HTMLAnchorElement> &
	{
		to: string;
	}) => (
		<a href={to} {...anchorProps}>
			{children}
		</a>
	),
	useRouterState: vi.fn(({select}: {select: (state: unknown) => unknown}) =>
		select(
			{
				location:
				{
					pathname: routerMocks.pathname,
				},
			},
		),
	),
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

vi.mock("../hooks/useUser", () => (
{
	useUserNeedsDisplayName: vi.fn(),
}));

const renderPrompt = (needsDisplayName: boolean | undefined, pathname = "/") =>
{
	routerMocks.pathname = pathname;
	vi.mocked(useAuthState).mockReturnValue([
		{
			uid: "alice",
		},
		false,
		undefined,
	] as ReturnType<typeof useAuthState>);
	vi.mocked(useUserNeedsDisplayName).mockReturnValue(
		{
			data: needsDisplayName,
		} as ReturnType<typeof useUserNeedsDisplayName>,
	);
	const {container} = render(<DisplayNamePrompt />);
	return {
		text: container.textContent?.replace(/\s+/g, " ").trim() ?? "",
		links: Array.from(container.querySelectorAll("a")).map((link) => link.getAttribute("href")),
		lookupCalls: vi.mocked(useUserNeedsDisplayName).mock.calls,
	};
};

describe("DisplayNamePrompt", () =>
{
	beforeEach(() =>
	{
		vi.clearAllMocks();
	});

	it("asks a new user to choose a display name", () =>
	{
		expect(renderPrompt(true)).toStrictEqual(
			{
				text: "Welcome! Choose a display name to show on your blueprints.",
				links: ["/account"],
				lookupCalls: [["alice"]],
			},
		);
	});

	it("stays hidden once a display name has been chosen", () =>
	{
		expect(renderPrompt(false)).toStrictEqual(
			{
				text: "",
				links: [],
				lookupCalls: [["alice"]],
			},
		);
	});

	it("stays hidden on the account page itself", () =>
	{
		expect(renderPrompt(true, "/account")).toStrictEqual(
			{
				text: "",
				links: [],
				lookupCalls: [["alice"]],
			},
		);
	});
});
