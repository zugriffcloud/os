import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

import type { NitroPreset } from 'nitropack';

let technology = 'Nitro';
let packageJson: object;

if (hasDependency('@solidjs/start')) {
  technology = 'SolidStart';
} else if (hasDependency('next')) {
  technology = 'Next.js';
} else {
  try {
    fs.accessSync('nuxt.config.ts', fs.constants.R_OK);
    technology = 'Nuxt';
  } catch (_) {}
}

let externals = [];

if (
  hasDependency('@zugriff/postgres') == true &&
  hasDependency('postgres') == false
) {
  externals.push('postgres');
}
if (
  hasDependency('@zugriff/redis') == true &&
  hasDependency('ioredis') == false
) {
  externals.push('ioredis');
}
if (
  hasDependency('@zugriff/mailman') == true &&
  hasDependency('nodemailer') == false
) {
  externals.push('nodemailer');
}
if (hasDependency('@zugriff/env') == true) {
  externals.push('dotenv');
}

export default <NitroPreset>{
  extends: 'base-worker',
  entry: fileURLToPath(new URL('entry.ts', import.meta.url)),
  compressPublicAssets: false,
  minify: false,
  output: {
    dir: '.zugriff',
    publicDir: path.join('.zugriff', 'assets').toString(),
    serverDir: path.join('.zugriff', 'functions', 'chunks').toString(),
  },
  rollupConfig: {
    output: {
      entryFileNames: 'index.js',
      format: 'esm',
      sourcemap: false,
      inlineDynamicImports: false,
    },
  },
  commands: {
    preview: 'zugriff preview',
    deploy: 'zugriff deploy',
  },
  hooks: {
    async compiled() {
      await esbuild.build({
        entryPoints: [path.join('.zugriff', 'functions', 'chunks', 'index.js')],
        outfile: path.join('.zugriff', 'functions', 'index.js'),
        external: [
          ...externals,
          'node:async_hooks',
          'async_hooks',
          'node:buffer',
          'buffer',
          'node:assert',
          'assert',
          'node:events',
          'events',
          'node:path',
          'path',
          'node:process',
          'process',
          'node:util',
          'util',
          'node:string_decoder',
          'string_decoder',
          'zugriff:sockets',
          'cloudflare:sockets',
          'node:net',
          'net',
          'node:tls',
          'tls',
          'node:dns',
          'dns',
          'node:os',
          'os',
          'node:stream',
          'stream',
          'node:url',
          'url',
          'node:diagnostics_channel',
          'diagnostics_channel',
          'node:zlib',
          'zlib',
          'node:crypto',
          'crypto',
          'node:perf_hooks',
          'perf_hooks',
        ],
        target: 'esnext',
        bundle: true,
        minify: true,
        platform: 'browser',
        logLevel: 'error',
        format: 'esm',
        banner: {
          js: 'globalThis.global = globalThis;',
        },
      });

      writeFile(
        path.join('.zugriff', 'config.json'),
        JSON.stringify({
          version: 1,
          meta: {
            technology,
          },
          functions: [{ path: '/index.js', pattern: '*' }],
          assets: discoverFiles(path.join('.zugriff', 'assets')).map((asset) =>
            asset.startsWith('/') ? asset : '/' + asset
          ),
          preprocessors: {
            puppets: {},
            redirects: [],
          },
          postprocessors: {
            interceptors: [],
          },
        })
      );
    },
  },
};

function writeFile(location: string, data: string) {
  fs.writeFileSync(location, data);
}

function discoverFiles(basePath: string, clean = true): Array<string> {
  let files: Array<string> = [];

  for (const discovery of fs.readdirSync(basePath)) {
    const fullFilePath = path.join(basePath, discovery);
    const discoveryStats = fs.lstatSync(fullFilePath);

    if (discoveryStats.isDirectory()) {
      files = files.concat(discoverFiles(fullFilePath, false));
    } else {
      files.push(path.posix.join(basePath.replace(/\\/g, '/'), discovery));
    }
  }

  if (clean) files = files.map((file) => file.substring(basePath.length));

  return files;
}

export function isFile(location: string) {
  try {
    let stats = fs.lstatSync(location);
    return stats.isFile();
  } catch (_) {
    return false;
  }
}

export function hasDependency(dependency: string) {
  if (packageJson) {
    return (
      'dependencies' in packageJson &&
      typeof packageJson.dependencies == 'object' &&
      packageJson.dependencies !== null &&
      dependency in packageJson.dependencies
    );
  }

  if (isFile('package.json')) {
    let data = fs.readFileSync('package.json');
    packageJson = JSON.parse(data.toString());
    return hasDependency(dependency);
  }

  return 'unknown';
}
