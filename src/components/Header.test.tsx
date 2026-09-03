import { render } from "@testing-library/react";
import type React from "react";
import { describe, expect, it, vi } from "vite-plus/test";
import { useAuthState } from "react-firebase-hooks/auth";
import Header from "./Header";

vi.mock("@fortawesome/react-fontawesome", () => ({
  FontAwesomeIcon: () => <span aria-hidden="true" />,
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    params: _params,
    to,
    ...anchorProps
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    params?: Record<string, string>;
    to: string;
  }) => (
    <a href={to} {...anchorProps}>
      {children}
    </a>
  ),
}));

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(() => ({})),
  signOut: vi.fn(),
}));

vi.mock("react-firebase-hooks/auth", () => ({
  useAuthState: vi.fn(),
}));

vi.mock("../base", () => ({
  app: {},
}));

vi.mock("../hooks/useModerators", () => ({
  useIsModerator: vi.fn(() => ({ data: false })),
}));

vi.mock("./auth/AuthenticationForm", () => ({
  AuthenticationForm: () => <div>Authentication form</div>,
}));

const normalizeText = (element: Element | null): string =>
  element?.textContent?.replace(/\s+/g, " ").trim() ?? "";

describe("Header", () => {
  it("renders the compact navigation labels and accessible home link", () => {
    vi.mocked(useAuthState).mockReturnValue([
      { uid: "alice", displayName: "Alice" },
      false,
      undefined,
    ] as ReturnType<typeof useAuthState>);

    const { container } = render(<Header />);
    const homeLink = container.querySelector(".navbar-brand a");
    const primaryLinks = container.querySelectorAll(
      ".primary-navigation > .nav-item > .nav-link, .primary-navigation > .nav-link",
    );
    const accountToggle = container.querySelector(".account-navigation .dropdown-toggle");

    expect({
      accountLabel: normalizeText(accountToggle),
      homeLink: {
        ariaLabel: homeLink?.getAttribute("aria-label"),
        text: normalizeText(homeLink),
        title: homeLink?.getAttribute("title"),
      },
      primaryLabels: Array.from(primaryLinks, normalizeText),
    }).toStrictEqual({
      accountLabel: "Account",
      homeLink: {
        ariaLabel: "Factorio Prints home",
        text: "",
        title: "Factorio Prints home",
      },
      primaryLabels: [
        "Search",
        "Recent",
        "Favorites",
        "Collection",
        "Create",
        "Chat",
        "Contributors",
        "GitHub",
        "Donate",
      ],
    });
  });
});
