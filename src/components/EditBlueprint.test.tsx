import {render, screen} from "@testing-library/react";
import {useAuthState} from "react-firebase-hooks/auth";
import {beforeEach, describe, expect, it, vi} from "vite-plus/test";
import {useIsModerator} from "../hooks/useModerators";
import EditBlueprint from "./EditBlueprint";

vi.mock("@fortawesome/react-fontawesome", () => (
{
	FontAwesomeIcon: () => <span aria-hidden="true" />,
}));

vi.mock("@tanstack/react-router", () => (
{
	useNavigate: vi.fn(() => vi.fn()),
	useParams: vi.fn(() => (
	{
		blueprintId: "blueprint-100",
	})),
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

const blueprint =
{
	author:
	{
		userId: "owner-100",
	},
	blueprintString: "0eNq-not-a-real-blueprint",
	descriptionMarkdown: "A description long enough",
	image: null,
	imageUrl: null,
	tags: {},
	title: "Owner's blueprint title",
};

vi.mock("../hooks/useEnrichedBlueprintSummary", () => (
{
	useEnrichedBlueprintSummary: vi.fn(() => (
	{
		data: {},
		isLoading: false,
	})),
}));

vi.mock("../hooks/useRawBlueprint", () => (
{
	useRawBlueprint: vi.fn(() => (
	{
		data: blueprint,
		isSuccess: true,
		isLoading: false,
	})),
}));

vi.mock("../hooks/useEnrichedBlueprint", () => (
{
	useEnrichedBlueprint: vi.fn(() => (
	{
		data: blueprint,
		error: null,
		isLoading: false,
		isSuccess: true,
	})),
}));

vi.mock("../hooks/useTags", () => (
{
	useTags: vi.fn(() => (
	{
		data:
		{
			tags: [],
		},
		isSuccess: true,
		isLoading: false,
	})),
}));

vi.mock("../hooks/useModerators", () => (
{
	useIsModerator: vi.fn(),
}));

vi.mock("../hooks/useUpdateBlueprint", () => (
{
	useDeleteBlueprint: vi.fn(() => (
	{
		isPending: false,
		mutate: vi.fn(),
	})),
	useUpdateBlueprint: vi.fn(() => (
	{
		isPending: false,
		mutate: vi.fn(),
	})),
}));

vi.mock("./PageHeader", () => (
{
	default: ({title}: {title: string}) => <h1>{title}</h1>,
}));

vi.mock("./ImageUpload", () => (
{
	default: () => null,
}));

function signInAs(uid: string, isModerator: boolean)
{
	vi.mocked(useAuthState).mockReturnValue([
		{
			uid,
			displayName: uid,
		},
		false,
		undefined,
	] as ReturnType<typeof useAuthState>);
	vi.mocked(useIsModerator).mockReturnValue(
		{
			data: isModerator,
		} as ReturnType<typeof useIsModerator>,
	);
}

describe("EditBlueprint", () =>
{
	beforeEach(() =>
	{
		vi.clearAllMocks();
	});

	it("shows the Delete button to the blueprint's owner", () =>
	{
		signInAs("owner-100", false);

		render(<EditBlueprint />);

		expect(
			screen.getByRole(
				"button",
				{
					name: "Delete",
				},
			),
		).toBeTruthy();
	});

	it("shows the Delete button to a moderator who does not own the blueprint", () =>
	{
		signInAs("moderator-100", true);

		render(<EditBlueprint />);

		expect(
			screen.getByRole(
				"button",
				{
					name: "Delete",
				},
			),
		).toBeTruthy();
	});

	it("does not let a non-owner, non-moderator edit or delete the blueprint", () =>
	{
		signInAs("user-100", false);

		render(<EditBlueprint />);

		expect(screen.getByRole("heading").textContent).toBe("You are not the author of this blueprint.");
		expect(
			screen.queryByRole(
				"button",
				{
					name: "Delete",
				},
			),
		).toBeNull();
	});
});
