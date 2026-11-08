import {defineConfig} from "vite-plus";

export default defineConfig(
	{
		test:
		{
			projects: [
				{
					extends: true,
					test:
					{
						name: "app",
						environment: "jsdom",
						globals: true,
						setupFiles: ["./test/setup.ts"],
						exclude: ["**/.llm/**", "**/node_modules/**", "workers/blueprints/**"],
					},
				},
				// Runs inside workerd against real D1, so it needs its own pool.
				"workers/blueprints/vitest.config.ts",
			],
		},
		esbuild:
		{
			target: "node18",
		},
		ssr:
		{
			noExternal: [
				"@fortawesome/fontawesome-svg-core",
				"@fortawesome/free-solid-svg-icons",
				"@fortawesome/free-regular-svg-icons",
				"@fortawesome/free-brands-svg-icons",
				"@fortawesome/react-fontawesome",
			],
		},
	},
);
