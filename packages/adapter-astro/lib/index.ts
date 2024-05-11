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
  staticRouter,
  writeFile,
} from '$lib/util';

export default function createIntegration(
  config: {
    disableAssetsDefaultIndexHTMLRedirect?: boolean;
    puppets?: Record<string, string>;
    redirects?: Array<{ path: string; location: string; status: number }>;
  } = {}
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
            assets: {
              supportKind: 'stable',
              isSharpCompatible: false,
              isSquooshCompatible: false,
            },
          },
          adapterFeatures: {
            edgeMiddleware: true,
            functionPerRoute: false,
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
            external: ['postgres', 'ioredis', 'nodemailer', 'dotenv'],
            entryPoints: [entryPath],
            outfile: buildPath,
            allowOverwrite: true,
            format: 'esm',
            bundle: true,
            minify: false,
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

          let puppets = {};

          for (let route of options.routes) {
            if (route.prerender) {
              let path = route.route.replace(/\/$/g, '');
              puppets[path] = path + '/index.html';
            }
          }

          for (let [from, to] of Object.entries(config.puppets || {})) {
            puppets[from.replace(/\/$/, '')] = to;
          }

          let redirects = [];
          for (let redirect of config.redirects || []) {
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
              puppets,
              redirects,
              assets: discoverFiles(_config.build.client.pathname).map(
                (asset) => (asset.startsWith('/') ? asset : '/' + asset)
              ),
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
            adapterConfig.disableAssetsDefaultIndexHTMLRedirect == true
              ? []
              : staticRouter(assets);

          let puppets = {};

          for (let [from, to] of Object.entries(config.puppets || {})) {
            puppets[from.replace(/\/$/, '')] = to;
          }

          for (let redirect of config.redirects || []) {
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
              puppets: {},
              redirects,
              assets,
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
