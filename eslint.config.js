import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/', 'vault/', 'vault.example/'] },
  js.configs.recommended,
  {
    files: ['server.mjs', 'lib/**/*.mjs', 'hooks/**/*.mjs', 'eslint.config.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: globals.node },
  },
  {
    files: ['public/**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: globals.browser },
  },
  {
    rules: {
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },
];
