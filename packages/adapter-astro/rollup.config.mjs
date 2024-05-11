import typescript from '@rollup/plugin-typescript';
import pkg from './package.json';
import { builtinModules } from 'node:module';

const deps = Object.keys({
  ...(pkg.dependencies || {}),
  ...(pkg.devDependencies || {}),
});

/** @type {import('rollup').RollupOptions[]} */
export default [
  {
    input: 'lib/index.ts',
    external: [...builtinModules, ...deps],
    output: [
      {
        dir: 'dist',
        entryFileNames: '[name].mjs',
        format: 'esm',
        sourcemap: true,
      },
      {
        dir: 'dist',
        entryFileNames: '[name].cjs',
        format: 'commonjs',
        sourcemap: true,
      },
    ],
    plugins: [
      typescript({
        exclude: ['**/*.test.*', '**/__mocks__/*', '**/__tests__/*'],
      }),
    ],
  },
  {
    input: 'lib/handler.ts',
    external: [...builtinModules, ...deps],
    output: [
      {
        dir: 'dist',
        entryFileNames: '[name].js',
        format: 'esm',
        sourcemap: true,
      },
    ],
    plugins: [
      typescript({
        exclude: ['**/*.test.*', '**/__mocks__/*', '**/__tests__/*'],
      }),
    ],
  },
];
