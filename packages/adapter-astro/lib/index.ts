import type { AstroConfig, AstroIntegration } from 'astro';
import { wasmModuleLoader } from '$lib/wasm';
import { passthroughImageService } from 'astro/config';
import * as esbuild from 'esbuild';
import { fileURLToPath } from 'url';
import * as path from 'path';
import * as fs from 'fs';
import {
  createDirIfNotExists,
  discoverFiles,
  doesFileExist,
  staticRouter,
  writeFile,
} from '$lib/util';
import SHA3 from 'jssha';

export default function createIntegration(
  config: {
    build: {
      disableAssetsDefaultIndexHTMLRedirect?: boolean;
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
  } = { build: {} }
): AstroIntegration {
  const SERVER_BUILD_FOLDER = '/.temp/';
  const CLIENT_FOLDER = '/assets/';

  let _config: AstroConfig;

  let adapterConfig = config;

  return {
    name: '@zugriff/adapter-astro',
    hooks: {
      'astro:config:setup': ({ command, config, updateConfig, logger }) => {
        updateConfig({
          build: {
            client: new URL(`.${CLIENT_FOLDER}`, config.outDir),
            server: new URL(`.${SERVER_BUILD_FOLDER}`, config.outDir),
            serverEntry: 'handler.js',
            redirects: false,
          },
          vite: {
            // load .wasm files as WebAssembly modules
            plugins: [
              wasmModuleLoader({
                disabled: false,
                assetsDirectory: config.build.assets,
              }),
            ],
          },
          image: { service: passthroughImageService() },
        });
      },
      'astro:config:done': ({ setAdapter, config }) => {
        setAdapter({
          name: '@zugriff/adapter-astro',
          serverEntrypoint: '@zugriff/adapter-astro/handler.js',
          exports: ['handler'],
          supportedAstroFeatures: {
            staticOutput: 'stable',
            hybridOutput: 'stable',
            serverOutput: 'stable',
            sharpImageService: 'unsupported',
            envGetSecret: 'stable',
          },
          adapterFeatures: {
            edgeMiddleware: true,
            buildOutput: 'server',
          },
        });
        _config = config;
      },
      'astro:build:setup': ({ vite, target }) => {
        if (target === 'server') {
          vite.resolve ||= {};
          vite.resolve.alias ||= {};

          const aliases = [
            {
              find: 'react-dom/server',
              replacement: 'react-dom/server.browser',
            },
          ];

          if (Array.isArray(vite.resolve.alias)) {
            vite.resolve.alias = [...vite.resolve.alias, ...aliases];
          } else {
            for (const alias of aliases) {
              (vite.resolve.alias as Record<string, string>)[alias.find] =
                alias.replacement;
            }
          }
          vite.ssr ||= {};
          vite.ssr.target = 'webworker';

          vite.define = {
            ...vite.define,
          };
        }
      },
      'astro:build:done': async (options) => {
        let guards =
          config.build.preprocessors?.guards?.map((guard) => {
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

        let { pages, routes, dir } = options;

        try {
          fs.rmSync('.zugriff', { recursive: true, force: true });
        } catch {}
        if (_config.output !== 'static') {
          const entryPath = fileURLToPath(
            new URL(_config.build.serverEntry, _config.build.server)
          );
          const entryUrl = new URL(_config.build.serverEntry, _config.outDir);
          const buildPath = fileURLToPath(entryUrl);

          await esbuild.build({
            target: 'esnext',
            platform: 'browser',
            external: [
              'postgres',
              'ioredis',
              'nodemailer',
              'dotenv',
              'node:async_hooks',
            ],
            entryPoints: [entryPath],
            outfile: buildPath,
            allowOverwrite: true,
            format: 'esm',
            bundle: true,
            minify: true,
            logLevel: 'error',
            banner: { js: 'globalThis.global = globalThis;' },
            logOverride: {
              'ignored-bare-import': 'silent',
            },
            plugins: [],
          });

          writeFile(
            path.join('.zugriff', 'functions', 'index.js'),
            fs.readFileSync(buildPath).toString()
          );

          let assets = discoverFiles(_config.build.client.pathname).map(
            (asset) => (asset.startsWith('/') ? asset : '/' + asset)
          );

          let puppets = {};
          let redirects = [];

          for (let route of options.routes) {
            if (route.type == 'redirect') {
              if (typeof route.redirect == 'string') {
                redirects.push({
                  path: route.route,
                  status: 308,
                  location: route.redirect,
                });
              }

              continue;
            }

            if (route.type != 'page') continue;

            if (route.prerender) {
              if (route.params.length > 0) {
                for (let asset of assets.filter((asset) =>
                  route.pattern.test(asset)
                )) {
                  if (!asset.endsWith('.html')) continue;
                  let parts = asset.split('/');
                  parts.pop();

                  let puppet =
                    parts.length > 1 ? parts.join('/') : '/' + parts.join('/');
                  if (puppet == '/' && asset != '/index.html') continue;

                  puppets[puppet] = asset;
                }
              } else {
                if (route.route == '/' || route.route == '/index.html') {
                  if (assets.includes('/index.html')) {
                    puppets['/'] = '/index.html';
                  }
                  continue;
                }

                if (route.route.endsWith('/index.html')) {
                  if (assets.includes(route.route)) {
                    puppets[route.route.replace(/\/index\.html$/, '')] =
                      route.route;
                  }

                  continue;
                }

                if (assets.includes(route.route + '.html')) {
                  puppets[route.route] = route.route + '.html';
                  continue;
                }

                if (assets.includes(route.route + '/index.html')) {
                  puppets[route.route] = route.route + '/index.html';
                }
              }
            }
          }

          for (let redirect of config.build.preprocessors?.redirects || []) {
            redirect.path = redirect.path.replace(/\/$/g, '');
            redirects.push(redirect);
          }

          writeFile(
            path.join('.zugriff', 'config.json'),
            JSON.stringify({
              version: 1,
              meta: {
                technology: 'Astro',
              },
              functions: [{ path: '/index.js', pattern: '*' }],
              assets,
              preprocessors: {
                puppets,
                redirects,
                guards,
              },
              postprocessors: {
                interceptors: assets.includes('/404.html')
                  ? [
                      { status: 404, path: '/404.html', method: 'GET' },
                      ...(config.build.postprocessors?.interceptors || []),
                    ]
                  : config.build.postprocessors?.interceptors
                    ? config.build.postprocessors.interceptors
                    : [],
              },
            })
          );

          createDirIfNotExists(path.join('.zugriff', 'assets'));
          fs.cpSync(_config.build.client, path.join('.zugriff', 'assets'), {
            recursive: true,
          });
        } else {
          let assets = discoverFiles(_config.outDir.pathname).map((asset) =>
            asset.startsWith('/') ? asset : '/' + asset
          );

          let redirects =
            adapterConfig.build.disableAssetsDefaultIndexHTMLRedirect == true
              ? []
              : staticRouter(assets);

          for (let redirect of config.build.preprocessors?.redirects || []) {
            redirect.path = redirect.path.replace(/\/$/g, '');
            redirects.push(redirect);
          }

          writeFile(
            path.join('.zugriff', 'config.json'),
            JSON.stringify({
              version: 1,
              meta: {
                technology: 'Astro',
              },
              functions: [],
              assets,
              preprocessors: {
                puppets: {},
                redirects,
                guards,
              },
              postprocessors: {
                interceptors: assets.includes('/404.html')
                  ? [
                      { status: 404, path: '/404.html', method: 'GET' },
                      ...(config.build.postprocessors?.interceptors || []),
                    ]
                  : config.build.postprocessors?.interceptors
                    ? config.build.postprocessors.interceptors
                    : [],
              },
            })
          );

          createDirIfNotExists(path.join('.zugriff', 'assets'));
          fs.cpSync(_config.outDir, path.join('.zugriff', 'assets'), {
            recursive: true,
          });
        }
      },
    },
  };
}
