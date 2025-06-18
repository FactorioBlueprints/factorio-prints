module.exports = {
	root: true,
	extends: ['react-app', 'react-app/jest'],
	rules: {
		// React hooks - exhaustive deps is the main reason we're keeping ESLint
		'react-hooks/rules-of-hooks': 'error',
		'react-hooks/exhaustive-deps': 'warn',

		// Import rules Biome doesn't fully cover
		'import/first': 'error',
		'import/no-duplicates': 'error',
		'import/newline-after-import': 'error',

		// Disable rules that Biome handles
		'no-unused-vars': 'off',
		'no-undef': 'off',
	},
	overrides: [
		{
			files: ['**/*.ts', '**/*.tsx'],
			rules: {
				// TypeScript handles these
				'import/no-unresolved': 'off',
			},
		},
	],
};
