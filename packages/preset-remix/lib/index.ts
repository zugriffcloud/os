import * as path from 'node:path';
import * as fs from 'node:fs';

import * as esbuild from 'esbuild';
import type { Preset } from '@remix-run/dev';
import { discoverFiles, doesFileExist, staticRouter } from '$lib/util';

let entryServer: string;

const __dirname = path.resolve(import.meta.dirname);
const __filename = path.resolve(import.meta.filename);

export default function zugriff(
  options: {
    disableDefaultIndexHTMLRedirect?: boolean;
    disableEntryServerReplacement?: boolean;
    disableEntryServerCreation?: boolean;
  } = {}
): Preset {
  return {
    name: 'zugriff',
    remixConfigResolved: async (config) => {
      if (process.env.NODE_ENV == 'production') {
        try {
          fs.rmSync('.zugriff/functions', { recursive: true });
        } catch (_) {}
        try {
          fs.rmSync('.zugriff/assets', { recursive: true });
        } catch (_) {}
        try {
          fs.rmSync('.zugriff/config.json');
        } catch (_) {}
      }

      if (config.remixConfig.ssr) {
        entryServer = path.join(
          config.remixConfig.appDirectory,
          'entry.server.tsx'
        );

        let entryClientJSX = path.join(
          config.remixConfig.appDirectory,
          'entry.server.jsx'
        );

        let source = path.join(path.dirname(__filename), 'entry.server.tsx');
        if (await doesFileExist(entryClientJSX)) {
          source = path.join(path.dirname(__filename), 'entry.server.jsx');
          entryServer = path.join(
            config.remixConfig.appDirectory,
            'entry.server.jsx'
          );
        }

        if (
          !(await doesFileExist(entryServer)) &&
          !options.disableEntryServerCreation
        ) {
          fs.copyFileSync(source, entryServer);
        } else if (
          !options.disableEntryServerReplacement &&
          !options.disableEntryServerCreation
        ) {
          let suffix = 'tsx';
          if (entryServer.endsWith('jsx')) {
            suffix = 'jsx';
          }

          let nodeEntryServer = path.join(
            config.remixConfig.appDirectory,
            'entry.server.node.' + suffix
          );

          if (!(await doesFileExist(nodeEntryServer))) {
            let contents = fs.readFileSync(entryServer).toString();
            if (
              contents.match(
                /(?:from\s(?:"|')@remix-run\/node(?:"|'))|(?:from\s(?:"|')react-dom\/server(?:"|'))/gm
              ).length > 0
            ) {
              fs.renameSync(entryServer, nodeEntryServer);
              fs.copyFileSync(source, entryServer);
            }
          }
        }
      }
    },
    remixConfig: () => ({
      buildDirectory: '.zugriff/tmp',
      manifest: true,
      buildEnd: (config) => {
        fs.renameSync('.zugriff/tmp/client', '.zugriff/assets');

        if (config.remixConfig.ssr) {
          let handler = path.join(
            config.remixConfig.buildDirectory,
            'server',
            'handler.js'
          );

          fs.copyFileSync(
            path.join(path.dirname(__filename), 'handler.js'),
            handler
          );

          esbuild.buildSync({
            bundle: true,
            target: 'esnext',
            minify: true,
            platform: 'browser',
            logLevel: 'error',
            format: 'esm',
            external: ['postgres', 'ioredis', 'nodemailer', 'dotenv'],
            banner: { js: 'globalThis.global = globalThis;' },
            entryPoints: [handler],
            outfile: '.zugriff/functions/index.js',
          });

          fs.writeFileSync(
            '.zugriff/config.json',
            JSON.stringify({
              version: 1,
              meta: {
                technology: 'Remix',
              },
              functions: [{ path: '/index.js', pattern: '*' }],
              puppets: {},
              redirects: [],
              assets: discoverFiles('.zugriff/assets'),
            })
          );
        } else {
          // create route handler
          try {
            fs.mkdirSync('.zugriff/functions');
          } catch (_) {}

          let assets = discoverFiles('.zugriff/assets');

          fs.writeFileSync(
            '.zugriff/config.json',
            JSON.stringify({
              version: 1,
              meta: {
                technology: 'Remix',
              },
              functions: [],
              puppets: {},
              redirects:
                options &&
                options.disableDefaultIndexHTMLRedirect &&
                options.disableDefaultIndexHTMLRedirect == true
                  ? []
                  : staticRouter(assets),
              assets,
            })
          );
        }
      },
    }),
  };
}
