import {env} from "cloudflare:workers";
import {drizzle} from "drizzle-orm/d1";

/** Storage is shared by every test in a file, so each test starts by emptying every table. */
export const emptyDatabase = async () =>
{
	const {results} = await env.DB.prepare(
		"SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'd1_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'sqlite_%'",
	).all<
	{
		name: string;
	}>();
	await env.DB.batch(results.map(({name}) => env.DB.prepare(`DELETE FROM "${name}"`)));
	return drizzle(env.DB);
};
