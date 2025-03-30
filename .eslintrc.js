module.exports = {
  // Parser configuration
  parser: '@babel/eslint-parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    },
    requireConfigFile: false,
    babelOptions: {
      presets: ['@babel/preset-react']
    }
  },
  env: {
    browser: true,
    node: true,
    es6: true
  },
  // Basic rules without plugins
  rules: {
    // Styling rules
    'brace-style': ['error', 'allman'],
    'implicit-arrow-linebreak': 'off',
    'padded-blocks': ['error', 'never'],
    'jsx-quotes': ['error', 'prefer-single'],
    'quote-props': ['error', 'consistent-as-needed', {'numbers': true}],
    'eqeqeq': ['error', 'smart'],
    'one-var': ['error', 'never'],
    'comma-dangle': ['error', 'always-multiline'],
    'object-property-newline': ['error', {'allowMultiplePropertiesPerLine': true}],
    'operator-linebreak': ['error', 'before'],
    'indent': ['error', 'tab', {'SwitchCase': 1}],
    'key-spacing': ['error', {'align': 'colon'}],
    'no-multi-spaces': 'off',
    'no-tabs': 'off',

    // Add an empty rule for react/no-array-index-key so the disable comment works
    'react/no-array-index-key': 'off'
  },
  settings: {
    react: {
      version: 'detect'
    }
  }
};
