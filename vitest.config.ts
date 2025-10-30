import {defineConfig} from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'jsdom',
		globals: true,
		setupFiles: ['./test/setup.ts'],
		include: ['src/**/*.test.{ts,tsx}'],
		exclude: ['**/.llm/**', '**/node_modules/**'],
	},
	esbuild: {
		target: 'node18',
	},
});
