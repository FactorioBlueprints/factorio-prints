import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {TanStackRouterVite} from '@tanstack/router-vite-plugin';
import {sentryVitePlugin} from '@sentry/vite-plugin';
import {execSync} from 'child_process';
import type {UserConfig} from 'vite';

const version = execSync('git describe --always --tags', {encoding: 'utf8'}).trim();
const gitBranch = execSync('git rev-parse --abbrev-ref HEAD', {encoding: 'utf8'}).trim();
const buildTime = new Date().toISOString();

export default defineConfig(
	({}): UserConfig => ({
		define: {
			'import.meta.env.VITE_APP_VERSION': JSON.stringify(version),
			'import.meta.env.VITE_GIT_BRANCH': JSON.stringify(gitBranch),
			'import.meta.env.VITE_BUILD_TIME': JSON.stringify(buildTime),
		},
		plugins: [
			TanStackRouterVite({
				routeFilePrefix: '',
				routesDirectory: './src/routes',
				generatedRouteTree: './src/routeTree.gen.ts',
				disableTypes: false,
				autoCodeSplitting: false,
			}),
			react(),
			...(process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT
				? [
						sentryVitePlugin({
							org: process.env.SENTRY_ORG,
							project: process.env.SENTRY_PROJECT,
							authToken: process.env.SENTRY_AUTH_TOKEN,
							release: {
								name: version,
								setCommits: {
									auto: true,
								},
								...((process.env.SENTRY_ENVIRONMENT === 'production-firebase' ||
									process.env.SENTRY_ENVIRONMENT === 'production-cloudflare') && {
									deploy: {
										env: process.env.SENTRY_ENVIRONMENT,
									},
								}),
							},
							sourcemaps: {
								assets: './dist/**',
								filesToDeleteAfterUpload: ['./dist/**/*.map'],
							},
						}),
					]
				: []),
		],
		build: {
			sourcemap: true,
			rollupOptions: {
				output: {
					manualChunks: (id: string) => {
						if (id.includes('entitiesWithIcons')) return 'entities';
						return undefined;
					},
				},
			},
		},
		publicDir: 'public',
		server: {
			port: 3000,
			proxy: {
				'/api': 'http://localhost:8080',
			},
		},
		resolve: {
			extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
			alias: {
				src: '/src',
			},
		},
		test: {
			globals: true,
			environment: 'jsdom',
			setupFiles: ['./src/setupTests.ts'],
			exclude: ['.llm/**', 'node_modules/**'],
		},
	}),
);
