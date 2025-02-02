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

export default <NitroPreset>{
  extends: 'base-worker',
  entry: fileURLToPath(new URL('entry.ts', import.meta.url)),
  output: {
    dir: '.zugriff',
    publicDir: path.join('.zugriff', 'assets').toString(),
    serverDir: path.join('.zugriff', 'functions').toString(),
  },
  rollupConfig: {
    external: ['postgres', 'ioredis', 'nodemailer', 'dotenv'],
    output: {
      entryFileNames: 'index.js',
      format: 'esm',
      sourcemap: false,
    },
  },
  commands: {
    preview: 'zugriff run',
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
