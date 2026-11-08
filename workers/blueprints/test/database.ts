import {env} from "cloudflare:workers";
import {drizzle} from "drizzle-orm/d1";

/** Storage is shared by every test in a file, so each test starts by emptying the test tables. */
export const emptyDatabase = async () =>
{
	await env.DB.batch(
		["content", "item", "item_part", "item_version"].map((table) => env.DB.prepare(`DELETE FROM ${table}`)),
	);
	return drizzle(env.DB);
};
