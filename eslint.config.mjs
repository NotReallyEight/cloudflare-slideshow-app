// @ts-check

import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactRefresh from 'eslint-plugin-react-refresh';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11Y from 'eslint-plugin-jsx-a11y';
import _import from 'eslint-plugin-import';

export default defineConfig([
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    ignores: [
      '.prettierrc.js',
      'babel.config.js',
      'jest.config.js',
      'metro.config.js',
    ],
  },
  react.configs.flat.recommended,
  react.configs.flat['jsx-runtime'],
  {
    settings: {
      'react': {
        version: 'detect',
      },
      'import/ignore': ['react-native'],
      'import/resolver': {
        typescript: {
          project: './tsconfig.json',
        },
      },
    },
  },
  reactRefresh.configs.recommended,
  reactHooks.configs['recommended-latest'],
  jsxA11Y.flatConfigs.recommended,
  _import.flatConfigs.recommended,
]);
