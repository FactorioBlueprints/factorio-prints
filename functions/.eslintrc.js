module.exports = {
	root: true,
	env: {
		es6: true,
		node: true,
		commonjs: true,
	},
	extends: ['eslint:recommended'],
	parserOptions: {
		ecmaVersion: 2020,
	},
	rules: {
		quotes: ['error', 'double'],
		'object-curly-spacing': ['error', 'never'],
		indent: ['error', 2],
	},
};
