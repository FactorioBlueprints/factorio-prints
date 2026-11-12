import type {DatabaseSync} from "node:sqlite";
import {drizzle} from "drizzle-orm/d1";
import type {AuthUser} from "../../../functions/src/ingestEvents.ts";
import
{
	type DumpReconcileOptions,
	type DumpReconcileReport,
	reconcileDump,
} from "../../../scripts/dumpReconcileCore.ts";
import {reconcile, type ReconcileRequest} from "../src/reconcile/reconcile.ts";
import {localD1} from "./localD1.ts";

// Merges one Realtime Database backup into a local SQLite database, by running the Worker's own reconcile code on
// it (see scripts/dumpReconcileCore.ts for what the merge does).
//
// User profiles come from the dump's own users node. The fields only an account record carries (photo, provider,
// and the email and provider name where the profile lacks them) are kept from the stored row, so a profile is
// never blanked for want of an account listing. Without that listing, deleted accounts cannot be told apart from
// live ones, so no account is treated as deleted.

export interface StringStore
{
	put: (key: string, content: string) => Promise<unknown>;
}

export interface IngestDumpOptions extends Pick<
	DumpReconcileOptions,
	"readDump" | "dumpTime" | "blueprintTime" | "mode" | "amendAudit"
>
{
	database: DatabaseSync;
	/** Receives each blueprint string the database did not have, under its R2 key. */
	strings: StringStore;
}

type Node = Record<string, unknown>;

interface StoredUser
{
	user_id: string;
	provider_display_name: string | null;
	email: string | null;
	photo_u_r_l: string | null;
	provider_id: string | null;
}

const text = (value: unknown): string | null => (typeof value === "string" ? value : null);

/** Stands in for the account record: the profile's own account fields, else what the database already holds. */
const accountOf = (userId: string, profile: Node, stored: StoredUser | undefined): AuthUser =>
{
	const providerId = stored?.provider_id ?? text(profile.providerId);
	return {
		localId: userId,
		displayName: stored?.provider_display_name ?? null,
		email: stored?.email ?? null,
		photoUrl: text(profile.photoURL) ?? stored?.photo_u_r_l ?? null,
		providerUserInfo:
			providerId === null
				? null
				: [
						{
							providerId,
						},
					],
	};
};

export const ingestDump = async (options: IngestDumpOptions): Promise<DumpReconcileReport> =>
{
	const dependencies =
	{
		db: drizzle(localD1(options.database) as unknown as D1Database),
		strings: options.strings as unknown as R2Bucket,
	};
	const storedUsers = new Map(
		(
			options.database
				.prepare(
					`SELECT user_id, provider_display_name, email, photo_u_r_l, provider_id FROM firebase_user
					WHERE system_to = 253402300799999`,
				)
				.all() as unknown as StoredUser[]
		).map((user) => [user.user_id, user]),
	);
	return reconcileDump(
		{
			readDump: options.readDump,
			dumpTime: options.dumpTime,
			blueprintTime: options.blueprintTime,
			mode: options.mode,
			amendAudit: options.amendAudit,
			// Nothing limits the calls of one request here, unlike on the Worker.
			chunkSize: 500,
			send: (request) => reconcile(dependencies, request as ReconcileRequest),
			accountOf: (userId, profile) => accountOf(userId, profile, storedUsers.get(userId)),
		},
	);
};
