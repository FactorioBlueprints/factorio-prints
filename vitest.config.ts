import {defineConfig} from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'jsdom',
		globals: true,
		setupFiles: ['./src/setupTests.ts'],
		exclude: ['**/.llm/**', '**/node_modules/**'],
	},
	esbuild: {
		target: 'node18',
	},
	ssr: {
		noExternal: [
			'@fortawesome/fontawesome-svg-core',
			'@fortawesome/free-solid-svg-icons',
			'@fortawesome/react-fontawesome',
		],
	},
});
