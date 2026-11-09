declare namespace Cloudflare
{
	interface Env
	{
		SCHEMA_MIGRATIONS: import("cloudflare:test").D1Migration[];
		TEST_MIGRATIONS: import("cloudflare:test").D1Migration[];
	}
}
