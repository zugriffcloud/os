import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';

import pkg from './package.json';
import { builtinModules } from 'node:module';

const deps = Object.keys({
  ...(pkg.dependencies || {}),
  ...(pkg.devDependencies || {}),
});

// No Type Declarations
// https://github.com/rollup/plugins/issues/287

/** @type {import('rollup').RollupOptions[]} */
export default [
  {
    input: 'src/index.ts',
    external: [...builtinModules, ...deps],
    output: [
      {
        dir: 'dist',
        entryFileNames: '[name].mjs',
        format: 'esm',
        sourcemap: true,
        banner: '#!/usr/bin/env node',
      },
    ],
    plugins: [
      typescript({
        // exclude: ['**/*.test.*', '**/__mocks__/*', '**/__tests__/*'],
      }),
    ],
  },
  {
    input: 'src/install.ts',
    external: [...builtinModules, ...deps],
    output: [
      {
        dir: 'dist',
        entryFileNames: '[name].mjs',
        format: 'esm',
        sourcemap: true,
      },
    ],
    plugins: [
      typescript({
        // exclude: ['**/*.test.*', '**/__mocks__/*', '**/__tests__/*'],
      }),
      json(),
    ],
  },
];
