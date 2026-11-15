import {defineConfig} from "drizzle-kit";

// Migrations for the tables the temporal module's tests define; the real schema gets its own config.
// Paths are relative to the repository root, where `pnpm run blueprints:test-migrations` runs.
export default defineConfig(
	{
		dialect: "sqlite",
		schema: "./workers/blueprints/test/schema.ts",
		out: "./workers/blueprints/test/migrations",
	},
);
