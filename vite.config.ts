import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {TanStackRouterVite} from '@tanstack/router-vite-plugin';
import {sentryVitePlugin} from '@sentry/vite-plugin';
import {execSync} from 'child_process';
import type {ConfigEnv, UserConfig} from 'vite';

const version = execSync('git describe --always --tags', {encoding: 'utf8'}).trim();

export default defineConfig(
	({mode}: ConfigEnv): UserConfig => ({
		define: {
			'import.meta.env.VITE_APP_VERSION': JSON.stringify(version),
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
			...(mode === 'production' && process.env.SENTRY_AUTH_TOKEN
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
								deploy: {
									env: 'production',
								},
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
