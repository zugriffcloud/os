import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';
import * as esbuild from 'esbuild';
import type { Builder } from '@sveltejs/kit';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

export default function (
  options: {
    disableAutoPuppets?: boolean;
    puppets?: Record<string, string>;
    redirects?: Array<{ path: string; location: string; status: number }>;
  } = {}
) {
  return {
    name: '@zugriff/adapter-sveltekit',
    async adapt(builder: Builder) {
      const puppets = {};

      let redirects = (options.redirects || []).map((redirect) => {
        let path = redirect.path.replace(/\/$/, '');

        return {
          ...redirect,
          path: path == '' ? '/' : path,
        };
      });

      if (!options.disableAutoPuppets) {
        for (let route of builder.routes) {
          if (route.prerender) {
            let id = route.id.replace(/\/$/, '');
            let to = id == '' ? '/index.html' : route.id + '.html';
            puppets[id == '' ? '/' : id] = to;
          }
        }
      }

      for (let [path, to] of Object.entries(options.puppets || {})) {
        puppets[path] = to;
      }

      const zugriff_content = '.zugriff';
      const zugriff_tmp_content = builder.getBuildDirectory('.zugriff_tmp');

      try {
        fs.rmSync(zugriff_tmp_content, { recursive: true, force: true });
      } catch {}
      fs.mkdirSync(path.dirname(zugriff_tmp_content), { recursive: true });

      try {
        fs.rmSync(zugriff_content, { recursive: true, force: true });
      } catch {}
      fs.mkdirSync(path.dirname(zugriff_content), { recursive: true });

      const static_content = `${zugriff_content}/assets${builder.config.kit.paths.base}`;

      await builder.generateFallback(path.join(static_content, '404.html'));
      builder.writeClient(static_content);
      builder.writePrerendered(static_content);

      const relativePath = path.posix.relative(
        zugriff_tmp_content,
        builder.getServerDirectory()
      );

      builder.copy(
        path.join(__dirname, 'handler.js'),
        zugriff_tmp_content + '/handler.js',
        {
          replace: {
            SERVER: relativePath + '/index.js',
            MANIFEST: './manifest.js',
          },
        }
      );

      writeFile(
        `${zugriff_tmp_content}/manifest.js`,
        `export const manifest = ${builder.generateManifest({
          relativePath,
        })};\n`
      );

      await esbuild.build({
        entryPoints: [zugriff_tmp_content + '/handler.js'],
        outfile: zugriff_content + '/functions/index.js',
        external: ['postgres', 'ioredis', 'nodemailer', 'dotenv'],
        target: 'esnext',
        bundle: true,
        minify: true,
        platform: 'browser',
        logLevel: 'error',
        format: 'esm',
        banner: { js: 'globalThis.global = globalThis;' },
      });

      writeFile(
        zugriff_content + '/config.json',
        JSON.stringify({
          version: 1,
          meta: {
            technology: 'SvelteKit',
          },
          functions: [{ path: '/index.js', pattern: '*' }],
          puppets,
          redirects,
          assets: discoverFiles(static_content),
        })
      );
    },
  };
}

function writeFile(file: string, data: string) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  } catch {}

  fs.writeFileSync(file, data);
}

function discoverFiles(basePath: string, clean = true): Array<string> {
  let files: Array<string> = [];

  for (const discovery of fs.readdirSync(basePath)) {
    const fullFilePath = path.join(basePath, discovery);
    const discoveryStats = fs.lstatSync(fullFilePath);

    if (discoveryStats.isDirectory()) {
      files = files.concat(discoverFiles(fullFilePath, false));
    } else {
      files.push(fullFilePath);
    }
  }

  if (clean) files = files.map((file) => file.substring(basePath.length));

  return files;
}
