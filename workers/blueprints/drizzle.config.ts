import {defineConfig} from "drizzle-kit";

// Migrations for the real schema, which Klass generates from factorio-prints.klass (klass-generator-drizzle-schema).
// Paths are relative to the repository root, where `pnpm run blueprints:migrations` runs.
export default defineConfig(
	{
		dialect: "sqlite",
		schema: "./workers/blueprints/src/schema.ts",
		out: "./workers/blueprints/migrations",
	},
);
