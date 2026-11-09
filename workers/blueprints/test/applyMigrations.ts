import {applyD1Migrations} from "cloudflare:test";
import {env} from "cloudflare:workers";

// The real schema and the module's own test tables share one database; their table names do not overlap.
await applyD1Migrations(env.DB, env.SCHEMA_MIGRATIONS, "d1_migrations");
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS, "d1_test_migrations");
