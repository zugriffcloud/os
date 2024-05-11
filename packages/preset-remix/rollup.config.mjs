import typescript from '@rollup/plugin-typescript';
import pkg from './package.json';
import { builtinModules } from 'node:module';

const deps = Object.keys({
  ...(pkg.dependencies || {}),
  ...(pkg.devDependencies || {}),
});

/** @type {import('rollup').ExternalOption[]} */
const external = [...builtinModules, ...deps];

/** @type {import('rollup').InputPluginOption[]} */
const plugins = [
  typescript({
    exclude: ['**/*.test.*', '**/__mocks__/*', '**/__tests__/*'],
  }),
];

/** @type {import('rollup').RollupOptions[]} */
export default [
  {
    input: 'lib/index.ts',
    external,
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
    plugins,
  },
  {
    input: 'lib/render.ts',
    external,
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
    plugins,
  },
  {
    input: 'lib/handler.ts',
    external: [...external, './index.js'],
    output: [
      {
        dir: 'dist',
        entryFileNames: '[name].js',
        format: 'esm',
        sourcemap: true,
      },
    ],
    plugins,
  },
  {
    input: 'lib/entry.server.tsx',
    external,
    output: [
      {
        dir: 'dist',
        entryFileNames: '[name].jsx',
        format: 'esm',
        sourcemap: false,
      },
    ],
    plugins,
  },
];
