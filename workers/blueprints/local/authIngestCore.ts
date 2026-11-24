import type {DatabaseSync} from "node:sqlite";
import {drizzle} from "drizzle-orm/d1";
import {userEvent} from "../../../functions/src/ingestEvents.ts";
import {type AuthExport, toAccountRecord} from "../../../scripts/authExportCore.ts";
import {reconcile} from "../src/reconcile/reconcile.ts";
import {localD1} from "./localD1.ts";

// Brings the users of a local SQLite database in line with a listing of the project's Auth accounts, through the
// same user event live ingest sends. A user who still has an account gets the fields only the account carries; a
// user without one is marked deleted, which also ends their favorites and collection entries. Every change is
// dated by the instant the listing was taken.

interface StoredUser
{
	user_id: string;
	display_name: string;
	provider_display_name: string | null;
	email: string | null;
	email_verified: number;
	photo_u_r_l: string | null;
	provider_id: string | null;
}

export interface AuthIngestReport
{
	/** Current users in the database. */
	users: number;
	/** Users with no account, now marked deleted. */
	deleted: string[];
	/** Users whose account-only fields changed. */
	filled: number;
	unchanged: number;
}

export const applyAuthExport = async (
	database: DatabaseSync,
	authExport: AuthExport,
	mode: "shadow" | "repair",
): Promise<AuthIngestReport> =>
{
	const dependencies =
	{
		db: drizzle(localD1(database) as unknown as D1Database),
		// User events never store a blueprint string.
		strings: undefined as unknown as R2Bucket,
	};
	const accounts = new Map(authExport.users.map((user) => [user.uid, user]));
	const stored = database
		.prepare(
			`SELECT user_id, display_name, provider_display_name, email, email_verified, photo_u_r_l, provider_id
			FROM firebase_user WHERE system_to = 253402300799999 ORDER BY user_id`,
		)
		.all() as unknown as StoredUser[];

	const report: AuthIngestReport =
	{
		users: stored.length,
		deleted: [],
		filled: 0,
		unchanged: 0,
	};
	for (const user of stored)
	{
		const account = accounts.get(user.user_id);
		const authUser = account === undefined ? null : toAccountRecord(account);
		const profile =
			account === undefined
				? null
				:
					{
						displayName: user.display_name,
						providerDisplayName: user.provider_display_name,
						email: user.email,
						emailVerified: user.email_verified === 1,
						providerId: user.provider_id,
					};
		const result = await reconcile(
			dependencies,
			{
				mode,
				events: [userEvent(user.user_id, profile, authUser, authExport.exportedAt)],
			},
		);
		if (result.drift.length === 0)
		{
			report.unchanged++;
		}
		else if (account === undefined)
		{
			report.deleted.push(user.user_id);
		}
		else
		{
			report.filled++;
		}
	}
	return report;
};
