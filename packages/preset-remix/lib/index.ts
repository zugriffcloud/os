import * as path from 'node:path';
import * as fs from 'node:fs';

import * as esbuild from 'esbuild';
import type { Preset } from '@remix-run/dev';
import SHA3 from 'jssha';
import {
  discoverFiles,
  doesFileExist,
  hasDependency,
  staticRouter,
} from '$lib/util';

let entryServer: string;

const __dirname = path.resolve(import.meta.dirname);
const __filename = path.resolve(import.meta.filename);

export default function zugriff(
  options: {
    disableEntryServerReplacement?: boolean;
    disableEntryServerCreation?: boolean;
    build?: {
      externals?: string[];
      disableDefaultIndexHTMLRedirect?: boolean;
      preprocessors?: {
        puppets?: Record<string, string>;
        redirects?: Array<{ path: string; location: string; status: number }>;
        guards?: Array<{
          credentials: { username: string; password: string | null };
          scheme: 'basic';
          patterns: Array<string>;
        }>;
      };
      postprocessors?: {
        interceptors?: Array<{
          status: number;
          path: string;
          method:
            | 'GET'
            | 'HEAD'
            | 'POST'
            | 'PUT'
            | 'DELETE'
            | 'CONNECT'
            | 'OPTIONS'
            | 'TRACE'
            | 'PATCH';
        }>;
      };
    };
  } = {}
): Preset {
  return {
    name: 'zugriff',
    remixConfigResolved: async (config) => {
      if (process.env.NODE_ENV == 'production') {
        try {
          fs.rmSync(path.join('.zugriff', 'functions'), { recursive: true });
        } catch (_) {}
        try {
          fs.rmSync(path.join('.zugriff', 'assets'), { recursive: true });
        } catch (_) {}
        try {
          fs.rmSync(path.join('.zugriff', 'config.json'));
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
      buildDirectory: path.join('.zugriff', 'tmp'),
      manifest: true,
      buildEnd: async (config) => {
        let guards =
          options.build?.preprocessors?.guards?.map((guard) => {
            guard.credentials.username = new SHA3('SHA3-384', 'TEXT')
              .update(guard.credentials.username)
              .getHash('B64');
            if (guard.credentials.password) {
              guard.credentials.password = new SHA3('SHA3-384', 'TEXT')
                .update(guard.credentials.password)
                .getHash('B64');
            }

            return guard;
          }) || [];

        fs.renameSync(
          path.join('.zugriff', 'tmp', 'client'),
          path.join('.zugriff', 'assets')
        );

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

          let externals = options.build.externals ?? [];

          if (
            (await hasDependency('@zugriff/postgres')) == true &&
            (await hasDependency('postgres')) == false
          ) {
            externals.push('postgres');
          }
          if (
            (await hasDependency('@zugriff/redis')) == true &&
            (await hasDependency('ioredis')) == false
          ) {
            externals.push('ioredis');
          }
          if (
            (await hasDependency('@zugriff/mailman')) == true &&
            (await hasDependency('nodemailer')) == false
          ) {
            externals.push('nodemailer');
          }
          if ((await hasDependency('@zugriff/env')) == true) {
            externals.push('dotenv');
          }

          esbuild.buildSync({
            bundle: true,
            target: 'esnext',
            minify: true,
            platform: 'browser',
            logLevel: 'error',
            format: 'esm',
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
            banner: { js: 'globalThis.global = globalThis;' },
            entryPoints: [handler],
            outfile: path.join('.zugriff', 'functions', 'index.js'),
          });

          fs.writeFileSync(
            path.join('.zugriff', 'config.json'),
            JSON.stringify({
              version: 1,
              meta: {
                technology: 'Remix',
              },
              functions: [{ path: '/index.js', pattern: '*' }],
              assets: discoverFiles(path.join('.zugriff', 'assets')),
              preprocessors: {
                puppets: options.build?.preprocessors?.puppets || {},
                redirects: options.build?.preprocessors?.redirects || [],
                guards,
              },
              postprocessors: {
                interceptors: options.build?.postprocessors?.interceptors || [],
              },
            })
          );
        } else {
          // create route handler
          try {
            fs.mkdirSync(path.join('.zugriff', 'functions'));
          } catch (_) {}

          let assets = discoverFiles(path.join('.zugriff', 'assets'));

          fs.writeFileSync(
            path.join('.zugriff', 'config.json'),
            JSON.stringify({
              version: 1,
              meta: {
                technology: 'Remix',
              },
              functions: [],
              assets,
              preprocessors: {
                puppets: options.build?.preprocessors?.puppets || {},
                redirects: (
                  options.build?.preprocessors?.redirects || []
                ).concat(
                  options &&
                    options.build?.disableDefaultIndexHTMLRedirect == true
                    ? []
                    : staticRouter(assets)
                ),
                guards,
              },
              postprocessors: {
                interceptors: options.build?.postprocessors?.interceptors || [],
              },
            })
          );
        }
      },
    }),
  };
}
