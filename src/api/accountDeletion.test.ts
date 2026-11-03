import {deleteUser, GithubAuthProvider, GoogleAuthProvider, reauthenticateWithPopup} from "firebase/auth";
import {get, update} from "firebase/database";
import {beforeEach, describe, expect, it, vi} from "vite-plus/test";
import {anonymiseUserBlueprints, deleteUserBlueprints, reauthenticateAndDeleteUser} from "./accountDeletion";

vi.mock("firebase/auth", () => (
{
	deleteUser: vi.fn(),
	reauthenticateWithPopup: vi.fn(),
	GoogleAuthProvider: vi.fn(function GoogleAuthProvider(this: {id: string})
	{
		this.id = "google";
	}),
	GithubAuthProvider: vi.fn(function GithubAuthProvider(this: {id: string})
	{
		this.id = "github";
	}),
}));

vi.mock("firebase/database", () => (
{
	ref: vi.fn((_database: unknown, path = "/") => (
	{
		path,
	})),
	get: vi.fn(),
	update: vi.fn(),
}));

vi.mock("../utils/firebaseDatabase", () => (
{
	getFirebaseDatabase: vi.fn(() => ({})),
}));

const snapshot = (value: unknown) => (
{
	val: () => value,
	exists: () => value != null,
});

const mockDatabase = (data: Record<string, unknown>) =>
{
	vi.mocked(get).mockImplementation(
		async (reference) =>
			snapshot(
				data[
					(
						reference as unknown as
						{
							path: string;
						}
					).path
				],
			) as never,
	);
};

describe("accountDeletion", () =>
{
	beforeEach(() =>
	{
		vi.clearAllMocks();
		vi.mocked(update).mockResolvedValue(undefined);
	});

	it("clears the author name on every blueprint the user owns in one update", async () =>
	{
		mockDatabase(
			{
				"/users/alice/blueprints":
				{
					"bp-1": true,
					"bp-2": true,
				},
			},
		);

		await anonymiseUserBlueprints("alice");

		expect(vi.mocked(update).mock.calls).toStrictEqual([
			[
				{
					path: "/",
				},
				{
					"/blueprints/bp-1/author/displayName": null,
					"/blueprints/bp-2/author/displayName": null,
				},
			],
		]);
	});

	it("writes nothing when the user owns no blueprints", async () =>
	{
		mockDatabase(
			{
				"/users/alice/blueprints": null,
			},
		);

		await anonymiseUserBlueprints("alice");

		expect(vi.mocked(update).mock.calls).toStrictEqual([]);
	});

	it("deletes each blueprint the user owns through the owner delete path", async () =>
	{
		mockDatabase(
			{
				"/users/alice/blueprints":
				{
					"bp-1": true,
					"bp-2": true,
				},
				"/blueprints/bp-1/tags": ["/belt/balancer/"],
				"/blueprints/bp-2/tags": null,
			},
		);

		await deleteUserBlueprints("alice");

		expect(vi.mocked(update).mock.calls).toStrictEqual([
			[
				{
					path: "/",
				},
				{
					"/blueprints/bp-1/blueprintString": null,
				},
			],
			[
				{
					path: "/",
				},
				{
					"/blueprints/bp-1": null,
					"/users/alice/blueprints/bp-1": null,
					"/users/alice/collection/bp-1": null,
					"/blueprintSummaries/bp-1": null,
					"/byTag//belt/balancer//bp-1": null,
				},
			],
			[
				{
					path: "/",
				},
				{
					"/blueprints/bp-2/blueprintString": null,
				},
			],
			[
				{
					path: "/",
				},
				{
					"/blueprints/bp-2": null,
					"/users/alice/blueprints/bp-2": null,
					"/users/alice/collection/bp-2": null,
					"/blueprintSummaries/bp-2": null,
				},
			],
		]);
	});

	it("re-authenticates with the user's sign-in provider before deleting the account", async () =>
	{
		const user =
		{
			uid: "alice",
			providerData: [
				{
					providerId: "github.com",
				},
			],
		};
		vi.mocked(reauthenticateWithPopup).mockResolvedValue({} as never);
		vi.mocked(deleteUser).mockResolvedValue(undefined);

		await reauthenticateAndDeleteUser(user as never);

		const [[reauthenticatedUser, provider]] = vi.mocked(reauthenticateWithPopup).mock.calls;
		expect(
			{
				reauthenticatedUser,
				providerIsGithub: provider instanceof GithubAuthProvider,
				providerIsGoogle: provider instanceof GoogleAuthProvider,
				reauthenticateCalls: vi.mocked(reauthenticateWithPopup).mock.calls.length,
				deleteUser: vi.mocked(deleteUser).mock.calls,
				reauthenticatedBeforeDelete:
					vi.mocked(reauthenticateWithPopup).mock.invocationCallOrder[0] <
					vi.mocked(deleteUser).mock.invocationCallOrder[0],
			},
		).toStrictEqual(
			{
				reauthenticatedUser: user,
				providerIsGithub: true,
				providerIsGoogle: false,
				reauthenticateCalls: 1,
				deleteUser: [[user]],
				reauthenticatedBeforeDelete: true,
			},
		);
	});

	it("refuses to re-authenticate a password account with a popup", async () =>
	{
		const user =
		{
			uid: "alice",
			providerData: [
				{
					providerId: "password",
				},
			],
		};

		await expect(reauthenticateAndDeleteUser(user as never)).rejects.toThrow(
			"Sign out and sign back in, then try deleting your account again.",
		);
		expect(vi.mocked(deleteUser).mock.calls).toStrictEqual([]);
	});
});
