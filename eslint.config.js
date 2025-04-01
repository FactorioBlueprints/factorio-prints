import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
	{ ignores: ['dist', 'build', '.llm/**'] },
	{
		files          : ['**/*.test.{js,jsx}', '**/*.spec.{js,jsx}', '**/setupTests.js'],
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
			'brace-style'             : ['error', 'allman'],
			'implicit-arrow-linebreak': 'off',
			'padded-blocks'           : ['error', 'never'],
			'jsx-quotes'              : ['error', 'prefer-single'],
			'quote-props'             : ['error', 'consistent-as-needed', {numbers: true}],
			'eqeqeq'                  : ['error', 'smart'],
			'one-var'                 : ['error', 'never'],
			'comma-dangle'            : ['error', 'always-multiline'],
			'object-property-newline' : ['error', {allowMultiplePropertiesPerLine: true}],
			'operator-linebreak'      : ['error', 'before'],
			'indent'                  : ['error', 'tab', {SwitchCase: 1}],
			'key-spacing'             : ['error', {align: 'colon'}],
			'no-multi-spaces'         : 'off',
			'no-tabs'                 : 'off',
			'react/no-array-index-key': 'off',
		},
	},
]
