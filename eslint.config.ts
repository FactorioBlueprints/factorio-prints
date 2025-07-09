import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'
import type { Linter } from 'eslint'

const config: Linter.Config[] = [
	{ ignores: ['dist', 'build', '.llm/**'] },
	{
		files          : ['public/**/*.{ts,tsx}'],
		languageOptions: {
			globals: {
				ServiceWorkerGlobalScope: 'readonly',
				ExtendableEvent         : 'readonly',
			},
		},
	},
	{
		files          : ['vite.config.ts', 'vitest.config.ts'],
		languageOptions: {
			globals: {
				process: 'readonly',
			},
		},
	},
	{
		files          : ['**/*.test.{js,jsx,ts,tsx}', '**/*.spec.{js,jsx,ts,tsx}', '**/setupTests.{js,ts}'],
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.jest,
				vi        : 'readonly',
				expect    : 'readonly',
				it        : 'readonly',
				describe  : 'readonly',
				beforeEach: 'readonly',
				afterEach : 'readonly',
			},
		},
	},
	{
		files          : ['**/*.{js,jsx}'],
		languageOptions: {
			ecmaVersion: 2020,
			globals    : {
				...globals.browser,
				...globals.jest,
			},
			parserOptions: {
				ecmaVersion : 'latest',
				ecmaFeatures: { jsx: true },
				sourceType  : 'module',
			},
		},
		plugins: {
			'react-hooks'  : reactHooks,
			'react-refresh': reactRefresh,
		},
		rules: {
			...js.configs.recommended.rules,
			...reactHooks.configs.recommended.rules,
			'react-hooks/exhaustive-deps'         : 'error',
			'no-unused-vars'                      : ['error', { varsIgnorePattern: '^[A-Z_]' }],
			'react-refresh/only-export-components': [
				'warn',
				{ allowConstantExport: true },
			],
			// Formatting rules - some handled by Biome, some by ESLint
			'brace-style'             : 'off',
			'implicit-arrow-linebreak': 'off',
			'padded-blocks'           : 'off',
			'jsx-quotes'              : 'off', // Conflicts with Biome's jsxQuoteStyle: double
			'quote-props'             : 'off', // Conflicts with Biome's quoteProperties: asNeeded
			'eqeqeq'                  : ['error', 'smart'],
			'one-var'                 : ['error', 'never'],
			'comma-dangle'            : 'off', // Conflicts with Biome's trailingCommas: all
			'object-property-newline' : 'off',
			'operator-linebreak'      : 'off',
			'indent'                  : 'off',
			'key-spacing'             : 'off',
			'no-multi-spaces'         : 'off',
			'no-tabs'                 : 'off',
			'react/no-array-index-key': 'off',
		},
	},
	{
		files          : ['**/*.{ts,tsx}'],
		languageOptions: {
			ecmaVersion: 2020,
			globals    : {
				...globals.browser,
				...globals.jest,
			},
			parser       : tsparser,
			parserOptions: {
				ecmaVersion : 'latest',
				ecmaFeatures: { jsx: true },
				sourceType  : 'module',
				project     : './tsconfig.json',
			},
		},
		plugins: {
			'@typescript-eslint': tseslint as any,
			'react-hooks'       : reactHooks,
			'react-refresh'     : reactRefresh,
		},
		rules: {
			...tseslint.configs.recommended.rules,
			...reactHooks.configs.recommended.rules,
			'react-hooks/exhaustive-deps'         : 'error',
			'@typescript-eslint/no-unused-vars'   : ['error', { varsIgnorePattern: '^[A-Z_]' }],
			'@typescript-eslint/no-explicit-any'  : 'off', // TODO: Consider enabling this later
			'react-refresh/only-export-components': [
				'warn',
				{ allowConstantExport: true },
			],
			// Formatting rules - some handled by Biome, some by ESLint
			'brace-style'             : 'off',
			'implicit-arrow-linebreak': 'off',
			'padded-blocks'           : 'off',
			'jsx-quotes'              : 'off', // Conflicts with Biome's jsxQuoteStyle: double
			'quote-props'             : 'off', // Conflicts with Biome's quoteProperties: asNeeded
			'eqeqeq'                  : ['error', 'smart'],
			'one-var'                 : ['error', 'never'],
			'comma-dangle'            : 'off', // Conflicts with Biome's trailingCommas: all
			'object-property-newline' : 'off',
			'operator-linebreak'      : 'off',
			'indent'                  : 'off',
			'key-spacing'             : 'off',
			'no-multi-spaces'         : 'off',
			'no-tabs'                 : 'off',
			'react/no-array-index-key': 'off',
		},
	},
]

export default config
