import {env} from "cloudflare:workers";
import {drizzle} from "drizzle-orm/d1";

const tables = ["content", "item", "item_part", "item_version", "blueprint", "vote", "blueprint_vote_summary"];

/** Storage is shared by every test in a file, so each test starts by emptying the tables tests write. */
export const emptyDatabase = async () =>
{
	await env.DB.batch(tables.map((table) => env.DB.prepare(`DELETE FROM ${table}`)));
	return drizzle(env.DB);
};
