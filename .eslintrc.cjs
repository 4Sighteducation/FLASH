module.exports = {
  root: true,
  // Keep ESLint lightweight and compatible with this repo's TS/ESLint plugin versions.
  // (eslint-config-expo currently conflicts with our pinned @typescript-eslint rule schema.)
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react-hooks'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  env: {
    es2021: true,
    node: true,
    browser: true,
  },
  rules: {
    // React Native apps often use `any` at the edges; keep lint signal focused.
    '@typescript-eslint/no-explicit-any': 'off',
    // This repo uses explicit types/non-null assertions in several UI modules.
    // Disable these to avoid “red everywhere” in the editor.
    '@typescript-eslint/no-inferrable-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    'no-useless-escape': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    'prefer-const': 'off',
    'no-constant-condition': 'off',
    // If you ever want this back on, set it to "warn" (requires eslint-plugin-react-hooks).
    'react-hooks/exhaustive-deps': 'off',
  },
};


