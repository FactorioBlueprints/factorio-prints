import {defineConfig} from "vite-plus";
import react from "@vitejs/plugin-react";
import {TanStackRouterVite} from "@tanstack/router-vite-plugin";
import {sentryVitePlugin} from "@sentry/vite-plugin";
import {execSync} from "child_process";
import type {UserConfig} from "vite-plus";

process.title = "factorio-blueprints";

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
		lint: {
			plugins: ["oxc", "typescript", "unicorn", "react"],
			jsPlugins: [
				{
					name: "vite-plus",
					specifier: "vite-plus/oxlint-plugin",
				},
			],
			categories: {
				correctness: "warn",
			},
			rules: {
				"vite-plus/prefer-vite-plus-imports": "error",
			},
			env: {
				builtin: true,
			},
			ignorePatterns: ["dist", "build", ".llm/**", "functions/**"],
			overrides: [
				{
					files: ["functions/**/*.{ts,tsx}"],
					rules: {
						"no-array-constructor": "error",
						"no-unused-expressions": "error",
						"no-unused-vars": [
							"error",
							{
								varsIgnorePattern: "^([A-Z_]|_)",
								argsIgnorePattern: "^_",
								caughtErrorsIgnorePattern: "^_",
							},
						],
						eqeqeq: ["error", "smart"],
						"typescript/ban-ts-comment": "error",
						"typescript/no-duplicate-enum-values": "error",
						"typescript/no-empty-object-type": "error",
						"typescript/no-explicit-any": "off",
						"typescript/no-extra-non-null-assertion": "error",
						"typescript/no-misused-new": "error",
						"typescript/no-namespace": "error",
						"typescript/no-non-null-asserted-optional-chain": "error",
						"typescript/no-require-imports": "error",
						"typescript/no-this-alias": "error",
						"typescript/no-unnecessary-type-constraint": "error",
						"typescript/no-unsafe-declaration-merging": "error",
						"typescript/no-unsafe-function-type": "error",
						"typescript/no-wrapper-object-types": "error",
						"typescript/prefer-as-const": "error",
						"typescript/prefer-namespace-keyword": "error",
						"typescript/triple-slash-reference": "error",
					},
					env: {
						es2020: true,
						node: true,
					},
				},
				{
					files: ["public/**/*.{ts,tsx}"],
					globals: {
						ServiceWorkerGlobalScope: "readonly",
						ExtendableEvent: "readonly",
					},
				},
				{
					files: ["vite.config.ts", "vitest.config.ts"],
					globals: {
						process: "readonly",
					},
				},
				{
					files: ["**/*.test.{js,jsx,ts,tsx}", "**/*.spec.{js,jsx,ts,tsx}", "**/setupTests.{js,ts}"],
					globals: {
						vi: "readonly",
					},
					env: {
						browser: true,
						jest: true,
					},
				},
				{
					files: ["**/*.{js,jsx}"],
					rules: {
						"constructor-super": "error",
						"for-direction": "error",
						"getter-return": "error",
						"no-async-promise-executor": "error",
						"no-case-declarations": "error",
						"no-class-assign": "error",
						"no-compare-neg-zero": "error",
						"no-cond-assign": "error",
						"no-const-assign": "error",
						"no-constant-binary-expression": "error",
						"no-constant-condition": "error",
						"no-control-regex": "error",
						"no-debugger": "error",
						"no-delete-var": "error",
						"no-dupe-class-members": "error",
						"no-dupe-else-if": "error",
						"no-dupe-keys": "error",
						"no-duplicate-case": "error",
						"no-empty": "error",
						"no-empty-character-class": "error",
						"no-empty-pattern": "error",
						"no-empty-static-block": "error",
						"no-ex-assign": "error",
						"no-extra-boolean-cast": "error",
						"no-fallthrough": "error",
						"no-func-assign": "error",
						"no-global-assign": "error",
						"no-import-assign": "error",
						"no-invalid-regexp": "error",
						"no-irregular-whitespace": "error",
						"no-loss-of-precision": "error",
						"no-misleading-character-class": "error",
						"no-new-native-nonconstructor": "error",
						"no-nonoctal-decimal-escape": "error",
						"no-obj-calls": "error",
						"no-prototype-builtins": "error",
						"no-redeclare": "error",
						"no-regex-spaces": "error",
						"no-self-assign": "error",
						"no-setter-return": "error",
						"no-shadow-restricted-names": "error",
						"no-sparse-arrays": "error",
						"no-this-before-super": "error",
						"no-unassigned-vars": "error",
						"no-undef": "error",
						"no-unexpected-multiline": "error",
						"no-unreachable": "error",
						"no-unsafe-finally": "error",
						"no-unsafe-negation": "error",
						"no-unsafe-optional-chaining": "error",
						"no-unused-labels": "error",
						"no-unused-private-class-members": "error",
						"no-unused-vars": [
							"error",
							{
								varsIgnorePattern: "^([A-Z_]|_)",
								argsIgnorePattern: "^_",
								caughtErrorsIgnorePattern: "^_",
							},
						],
						"no-useless-assignment": "error",
						"no-useless-backreference": "error",
						"no-useless-catch": "error",
						"no-useless-escape": "error",
						"no-with": "error",
						"preserve-caught-error": "error",
						"require-yield": "error",
						"use-isnan": "error",
						"valid-typeof": "error",
						eqeqeq: ["error", "smart"],
						"react/exhaustive-deps": "error",
						"react/only-export-components": [
							"warn",
							{
								allowConstantExport: true,
							},
						],
					},
					env: {
						es2020: true,
						browser: true,
						jest: true,
					},
				},
				{
					files: ["src/**/*.{ts,tsx}", "!functions/**/*.{ts,tsx}"],
					rules: {
						"no-array-constructor": "error",
						"no-unused-expressions": "error",
						"no-unused-vars": [
							"error",
							{
								varsIgnorePattern: "^([A-Z_]|_)",
								argsIgnorePattern: "^_",
								caughtErrorsIgnorePattern: "^_",
							},
						],
						eqeqeq: ["error", "smart"],
						"react/exhaustive-deps": "error",
						"react/only-export-components": [
							"warn",
							{
								allowConstantExport: true,
							},
						],
						"typescript/ban-ts-comment": "error",
						"typescript/no-duplicate-enum-values": "error",
						"typescript/no-empty-object-type": "error",
						"typescript/no-explicit-any": "off",
						"typescript/no-extra-non-null-assertion": "error",
						"typescript/no-misused-new": "error",
						"typescript/no-namespace": "error",
						"typescript/no-non-null-asserted-optional-chain": "error",
						"typescript/no-require-imports": "error",
						"typescript/no-this-alias": "error",
						"typescript/no-unnecessary-type-constraint": "error",
						"typescript/no-unsafe-declaration-merging": "error",
						"typescript/no-unsafe-function-type": "error",
						"typescript/no-wrapper-object-types": "error",
						"typescript/prefer-as-const": "error",
						"typescript/prefer-namespace-keyword": "error",
						"typescript/triple-slash-reference": "error",
					},
					env: {
						es2020: true,
						browser: true,
						jest: true,
					},
				},
			],
			options: {
				typeAware: true,
				typeCheck: true,
			},
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
