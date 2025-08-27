module.exports = {
  root: true,
  extends: [
    '@react-native-community',
    'eslint:recommended',
    '@typescript-eslint/recommended', // Even though we're using JS, this is good for future TS migration
    'prettier'
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react-hooks'],
  overrides: [
    {
      files: ['*.js', '*.jsx'],
      rules: {
        // React Native specific rules
        'react-native/no-unused-styles': 'error',
        'react-native/split-platform-components': 'off', // We may not need platform-specific components
        'react-native/no-inline-styles': 'warn',
        'react-native/no-color-literals': 'off', // Allow color literals for now
        'react-native/no-raw-text': 'error',

        // React hooks rules
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn',

        // General JavaScript rules
        'no-console': 'warn',
        'no-debugger': 'error',
        'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        'prefer-const': 'error',
        'no-var': 'error',

        // Import rules
        'no-duplicate-imports': 'error',
        'prefer-template': 'error',

        // Disable some TypeScript rules since we're using JS
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-var-requires': 'off'
      }
    }
  ],
  env: {
    'react-native/react-native': true,
    es6: true,
    node: true
  },
  settings: {
    react: {
      version: 'detect'
    }
  }
};
