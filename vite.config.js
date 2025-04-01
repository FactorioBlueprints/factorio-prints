import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-vite-plugin'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import { version } from './package.json'

export default defineConfig(({ mode }) => ({
	define: {
		'import.meta.env.VITE_APP_VERSION': JSON.stringify(version),
	},
	plugins: [
		TanStackRouterVite({
			routeFilePrefix   : '',
			routesDirectory   : './src/routes',
			generatedRouteTree: './src/routeTree.gen.js',
			// Keep as 'js' until we migrate routes
			language          : 'js',
			// Keep disabled until we add types to routes
			disableTypes      : true,
			autoCodeSplitting : true,
		}),
		react(),
		// Only upload source maps in production when auth token is available
		// eslint-disable-next-line no-undef
		mode === 'production' && process.env.SENTRY_AUTH_TOKEN && sentryVitePlugin({
			// eslint-disable-next-line no-undef
			org      : process.env.SENTRY_ORG,
			// eslint-disable-next-line no-undef
			project  : process.env.SENTRY_PROJECT,
			// eslint-disable-next-line no-undef
			authToken: process.env.SENTRY_AUTH_TOKEN,
			release  : {
				name: version,
			},
			sourcemaps: {
				// Upload source maps to Sentry
				assets                  : './dist/**',
				// Don't include source maps in the build output after upload
				filesToDeleteAfterUpload: ['./dist/**/*.map'],
			},
		}),
	].filter(Boolean),
	build: {
		sourcemap: true, // Enable source maps for production builds
	},
	server: {
		port : 3000,
		proxy: {
			'/api': 'http://localhost:8080',
		},
	},
	resolve: {
		extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
		alias     : {
			src: '/src',
		},
	},
	test: {
		globals    : true,
		environment: 'jsdom',
		setupFiles : ['./src/setupTests.js'],
		exclude    : ['.llm/**', 'node_modules/**'],
	},
}))
