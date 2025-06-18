module.exports = {
	extends: [
		'react-app',
		'react-app/jest',
	],
	settings: {
		propWrapperFunctions: ['forbidExtraProps'],
	},
	rules: {
		// Disable formatting rules that Biome handles
		'template-curly-spacing': 'off',
		'indent': 'off',
		'semi': 'off',
		'quotes': 'off',
		'comma-dangle': 'off',
		'arrow-parens': 'off',
		'object-curly-spacing': 'off',
		'jsx-quotes': 'off',
		'linebreak-style': 'off',
		'max-len': 'off',

		// Disable rules that Biome already covers
		'no-const-assign': 'off',
		'no-debugger': 'off',
		'no-dupe-args': 'off',
		'no-dupe-class-members': 'off',
		'no-dupe-keys': 'off',
		'no-duplicate-case': 'off',
		'no-empty-character-class': 'off',
		'no-empty-pattern': 'off',
		'no-ex-assign': 'off',
		'no-extra-boolean-cast': 'off',
		'no-fallthrough': 'off',
		'no-func-assign': 'off',
		'no-global-assign': 'off',
		'no-invalid-regexp': 'off',
		'no-obj-calls': 'off',
		'no-redeclare': 'off',
		'no-self-assign': 'off',
		'no-setter-return': 'off',
		'no-shadow-restricted-names': 'off',
		'no-sparse-arrays': 'off',
		'no-unreachable': 'off',
		'no-unsafe-finally': 'off',
		'no-unsafe-negation': 'off',
		'no-unused-labels': 'off',
		'no-unused-vars': 'off',
		'no-useless-catch': 'off',
		'no-useless-escape': 'off',
		'use-isnan': 'off',
		'valid-typeof': 'off',
		'no-var': 'off',
		'prefer-const': 'off',
		'no-delete-var': 'off',

		// React-specific rules that Biome doesn't fully cover
		'react/jsx-key': 'error',
		'react/jsx-no-duplicate-props': 'error',
		'react/jsx-no-undef': 'error',
		'react/no-direct-mutation-state': 'error',
		'react/no-string-refs': 'error',
		'react/no-unknown-property': 'error',
		'react/require-render-return': 'error',

		// React Hooks rules - Biome's useExhaustiveDependencies is off
		'react-hooks/rules-of-hooks': 'error',
		'react-hooks/exhaustive-deps': 'warn',

		// Import rules that Biome doesn't cover
		'import/first': 'error',
		'import/no-amd': 'error',
		'import/no-webpack-loader-syntax': 'error',

		// JSX a11y rules that complement Biome's a11y rules
		'jsx-a11y/alt-text': 'warn',
		'jsx-a11y/anchor-has-content': 'warn',
		'jsx-a11y/anchor-is-valid': 'warn',
		'jsx-a11y/aria-activedescendant-has-tabindex': 'warn',
		'jsx-a11y/aria-props': 'warn',
		'jsx-a11y/aria-proptypes': 'warn',
		'jsx-a11y/aria-role': 'warn',
		'jsx-a11y/aria-unsupported-elements': 'warn',
		'jsx-a11y/heading-has-content': 'warn',
		'jsx-a11y/html-has-lang': 'warn',
		'jsx-a11y/iframe-has-title': 'warn',
		'jsx-a11y/img-redundant-alt': 'warn',
		'jsx-a11y/no-access-key': 'warn',
		'jsx-a11y/no-distracting-elements': 'warn',
		'jsx-a11y/no-redundant-roles': 'warn',
		'jsx-a11y/role-has-required-aria-props': 'warn',
		'jsx-a11y/role-supports-aria-props': 'warn',
		'jsx-a11y/scope': 'warn',
	},
	overrides: [
		{
			files: ['**/*.ts', '**/*.tsx'],
			rules: {
				// TypeScript specific rules that Biome doesn't cover
				'@typescript-eslint/no-unused-vars': 'off', // Biome handles this
				'@typescript-eslint/no-explicit-any': 'off', // Biome handles this
			},
		},
	],
};
