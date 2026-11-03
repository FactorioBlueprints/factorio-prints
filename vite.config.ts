import {defineConfig} from "vite-plus";
import react from "@vitejs/plugin-react";
import {TanStackRouterVite} from "@tanstack/router-vite-plugin";
import {sentryVitePlugin} from "@sentry/vite-plugin";
import {execSync} from "child_process";
import type {UserConfig} from "vite-plus";

type SentryUploadEnvironment = {
	SENTRY_AUTH_TOKEN?: string;
	SENTRY_ENVIRONMENT?: string;
	SENTRY_ORG?: string;
	SENTRY_PROJECT?: string;
	SENTRY_RELEASE?: string;
};

const fallbackVersion = execSync("git describe --always --tags", {encoding: "utf8"}).trim();
const gitBranch = execSync("git rev-parse --abbrev-ref HEAD", {encoding: "utf8"}).trim();
const buildTime = new Date().toISOString();

export const hasSentryUploadCredentials = (environment: SentryUploadEnvironment = process.env) =>
	Boolean(environment.SENTRY_AUTH_TOKEN && environment.SENTRY_ORG && environment.SENTRY_PROJECT);

export const getReleaseVersion = (environment: SentryUploadEnvironment = process.env) =>
	environment.SENTRY_RELEASE ?? fallbackVersion;

export const createViteConfiguration = (environment: SentryUploadEnvironment = process.env): UserConfig => {
	const sentryUploadEnabled = hasSentryUploadCredentials(environment);
	const version = getReleaseVersion(environment);

	return {
		run: {
			tasks: {
				check: {
					command: "vp check",
					dependsOn: ["check:images", "check:toolchain"],
				},
				"test:run": {
					command: "node node_modules/vitest/dist/cli.js run",
					cache: {
						input: [{auto: true}, "!node_modules/.vitest-cache/**"],
						output: [],
					},
				},
			},
		},
		fmt: {
			ignorePatterns: ["AGENTS.md"],
			semi: true,
			singleQuote: false,
			useTabs: true,
			tabWidth: 4,
			printWidth: 120,
			proseWrap: "never",
			embeddedLanguageFormatting: "off",
			bracketSpacing: false,
			trailingComma: "all",
			arrowParens: "always",
			overrides: [
				{
					files: [".yamllint.yaml", "**/*.yaml", "**/*.yml"],
					options: {
						useTabs: false,
						tabWidth: 2,
						printWidth: 240,
					},
				},
				{
					files: ["**/*.md"],
					options: {
						printWidth: 320,
					},
				},
			],
		},
		define: {
			"import.meta.env.VITE_APP_VERSION": JSON.stringify(version),
			"import.meta.env.VITE_GIT_BRANCH": JSON.stringify(gitBranch),
			"import.meta.env.VITE_BUILD_TIME": JSON.stringify(buildTime),
		},
		plugins: [
			TanStackRouterVite({
				routeFilePrefix: "",
				routesDirectory: "./src/routes",
				generatedRouteTree: "./src/routeTree.gen.ts",
				disableTypes: false,
				autoCodeSplitting: true,
			}),
			react(),
			...(sentryUploadEnabled
				? [
						sentryVitePlugin({
							org: environment.SENTRY_ORG,
							project: environment.SENTRY_PROJECT,
							authToken: environment.SENTRY_AUTH_TOKEN,
							release: {
								name: version,
								setCommits: {
									auto: true,
								},
								...((environment.SENTRY_ENVIRONMENT === "production-firebase" ||
									environment.SENTRY_ENVIRONMENT === "production-cloudflare") && {
									deploy: {
										env: environment.SENTRY_ENVIRONMENT,
									},
								}),
							},
							sourcemaps: {
								assets: "./dist/**",
								filesToDeleteAfterUpload: ["./dist/**/*.map"],
							},
						}),
					]
				: []),
		],
		build: {
			sourcemap: sentryUploadEnabled,
			rolldownOptions: {
				output: {
					codeSplitting: {
						groups: [{name: "entities", test: /entitiesWithIcons/}],
					},
				},
			},
		},
		publicDir: "public",
		server: {
			port: 3000,
			proxy: {
				"/api": "http://localhost:8080",
			},
		},
		resolve: {
			extensions: [".js", ".jsx", ".ts", ".tsx", ".json"],
			alias: {
				src: "/src",
			},
		},
		optimizeDeps: {
			include: ["@fortawesome/fontawesome-svg-core"],
		},
	};
};

export default defineConfig(() => createViteConfiguration());
