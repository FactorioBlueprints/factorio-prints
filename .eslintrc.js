module.exports = {
	extends: [
		'eslint-config-react-app',
		'react-app',
		'react-app/jest',
		// 'plugin:jsx-a11y/recommended',
		// 'plugin:lodash/recommended',
		// 'plugin:promise/recommended',
	],
	rules: {
		// TODO: Remove when is https://github.com/babel/babel-eslint/issues/530 fixed
		"template-curly-spacing" : "off",
		indent : "off"
	},
};
