import type { Preset } from '@react-router/dev/config';
import * as esbuild from 'esbuild';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';

import { hasDependency, discoverFiles } from '$lib/util';

export default function preset(
  options: {
    externals?: string[];
    preprocessors?: {
      puppets?: Record<string, string>;
      redirects?: Array<{ path: string; location: string; status: number }>;
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
  } = {}
): Preset {
  return {
    name: 'zugriff',
    reactRouterConfig: (config) => ({
      async buildEnd({ buildManifest, reactRouterConfig: config, viteConfig }) {
        if (viteConfig.command !== 'build') return;

        let { buildDirectory, serverBuildFile } = config;

        let assetBuildDirectory = path.join(buildDirectory, 'client');
        let serverBuildDirectory = path.join(buildDirectory, 'server');

        let assetDirectory = path.join('.zugriff', 'assets');
        let functionDirectory = path.join('.zugriff', 'functions');

        // Cleanup
        try {
          await fs.rm(path.join('.zugriff'), {
            recursive: true,
            force: true,
          });
        } catch (_) {}

        for (let directory of [assetDirectory, functionDirectory]) {
          await fs.mkdir(directory, {
            recursive: true,
          });
        }

        await fs.cp(assetBuildDirectory, assetDirectory, {
          recursive: true,
          force: true,
        });

        let functions: { path: string; pattern: string }[] = [];

        let puppets: { [key: string]: string } =
          options.preprocessors?.puppets ?? {};
        let redirects: {
          status: number;
          path: string;
          location: string;
        }[] = options.preprocessors?.redirects ?? [];

        let interceptors: {
          status: number;
          path: string;
          method: string;
        }[] = options.postprocessors?.interceptors ?? [];

        let assets = await discoverFiles(assetDirectory);

        let configuration = {
          version: 1,
          meta: null,
          functions,
          assets,
          preprocessors: {
            puppets,
            redirects,
          },
          postprocessors: {
            interceptors,
          },
        };

        if (config.ssr) {
          await fs.writeFile(
            path.join(serverBuildDirectory, 'handler.ts'),
            `
                import * as build from "${path.join(serverBuildDirectory, serverBuildFile)}";
                import { createRequestHandler as createRemixRequestHandler } from "react-router";

                export function handler(request: Request) {
                  if ("fetch" in build) {  
                    return build.fetch(request);
                  } else {
                    let handleRequest = createRemixRequestHandler(build);
                    return handleRequest(request);
                  }
                }
              `
          );

          let externals = options.externals ?? [];

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

          await esbuild.build({
            entryPoints: [path.join(serverBuildDirectory, 'handler.ts')],
            outfile: path.join(functionDirectory, 'index.js'),
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
            banner: { js: 'globalThis.global = globalThis;' },
          });

          configuration.functions.push({ path: '/index.js', pattern: '*' });
        } else {
          // SPA
          for (const [_, route] of Object.entries(
            buildManifest?.routes ?? {}
          )) {
            if (route.path) {
              let path = route.path;
              if (!path.startsWith('/')) path = '/' + path;
              puppets[path] = '/index.html';
            }
          }
        }

        // Prefer prerendered routes
        for (let asset of assets) {
          if (asset.endsWith('/index.html')) {
            configuration.preprocessors.puppets[
              asset.replace(/\/index\.html$/, '') || '/'
            ] = asset;
          }
        }

        await fs.writeFile(
          path.join('.zugriff', 'config.json'),
          JSON.stringify(configuration)
        );
      },
    }),
  };
}
