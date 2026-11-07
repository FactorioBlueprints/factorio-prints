// Worker secrets are set with `wrangler secret put` and are not part of the generated Env.
interface Env
{
	INGEST_SECRET?: string;
}
