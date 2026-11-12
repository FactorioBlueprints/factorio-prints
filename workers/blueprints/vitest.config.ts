import path from "node:path";
import {cloudflareTest, readD1Migrations} from "@cloudflare/vitest-plugin";
import {defineConfig} from "vite-plus";

const workerRoot = import.meta.dirname;

export default defineConfig(async () =>
{
	const migrations = await readD1Migrations(path.join(workerRoot, "test/migrations"));
	const schemaMigrations = await readD1Migrations(path.join(workerRoot, "migrations"));

	return {
		root: workerRoot,
		plugins: [
			cloudflareTest(
				{
					wrangler:
					{
						configPath: path.join(workerRoot, "wrangler.jsonc"),
					},
					miniflare:
					{
						bindings:
						{
							TEST_MIGRATIONS: migrations,
							SCHEMA_MIGRATIONS: schemaMigrations,
						},
					},
				},
			),
		],
		test:
		{
			name: "blueprints-worker",
			include: ["src/**/*.test.ts"],
			setupFiles: ["./test/applyMigrations.ts"],
		},
	};
});
