import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { NitroPreset } from 'nitropack';

let technology = 'Nitro';

try {
  fs.accessSync('nuxt.config.ts', fs.constants.R_OK);
  technology = 'Nuxt';
} catch (_) {}

try {
  fs.accessSync('app.config.ts', fs.constants.R_OK);
  let file = fs.readFileSync('app.config.ts');
  if (file.toString().includes('@solidjs')) {
    technology = 'SolidStart';
  }
} catch (_) {}

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
  output: {
    dir: '.zugriff',
    publicDir: path.join('.zugriff', 'assets').toString(),
    serverDir: path.join('.zugriff', 'functions').toString(),
  },
  rollupConfig: {
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
    output: {
      entryFileNames: 'index.js',
      format: 'esm',
      sourcemap: false,
    },
  },
  commands: {
    preview: 'zugriff preview',
    deploy: 'zugriff deploy',
  },
  hooks: {
    compiled() {
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
            guards: [],
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

export function doesFileExist(location) {
  try {
    let stats = fs.lstatSync(location);
    return stats.isFile();
  } catch (_) {
    return false;
  }
}

let packageJson: object;

export function hasDependency(dependency: string) {
  if (packageJson) {
    if (
      'dependencies' in packageJson &&
      typeof packageJson.dependencies == 'object' &&
      dependency in packageJson.dependencies
    ) {
      return true;
    } else {
      return false;
    }
  }

  if (doesFileExist('package.json')) {
    try {
      let data = fs.readFileSync('package.json');
      let value = JSON.parse(data.toString());
      packageJson = value;
      if (
        'dependencies' in value &&
        typeof value.dependencies == 'object' &&
        dependency in value.dependencies
      ) {
        return true;
      } else {
        return false;
      }
    } catch (_) {
      return 'unknown';
    }
  }

  return 'unknown';
}
