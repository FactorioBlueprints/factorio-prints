module.exports = {
	extends: [
		'eslint-config-react-app',
		'react-app',
		'react-app/jest',
		// 'plugin:jsx-a11y/recommended',
		// 'plugin:lodash/recommended',
		// 'plugin:promise/recommended',
	],
	settings: {
		// The names of any functions used to wrap the propTypes object, such as `forbidExtraProps`. If this isn't set, any propTypes wrapped in a function will be skipped.
		propWrapperFunctions: [
			'forbidExtraProps',
		],
	},
	rules: {
		// TODO: Remove when is https://github.com/babel/babel-eslint/issues/530 fixed
		"template-curly-spacing" : "off",
		indent : "off"
	},
};
