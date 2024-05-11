import * as fs from 'node:fs';
import * as path from 'node:path';
import * as esbuild from 'esbuild';

export function createDirIfNotExists(location: string) {
  try {
    fs.mkdirSync(path.dirname(location), { recursive: true });
  } catch {}
}

export function writeFile(location: string, data: string) {
  createDirIfNotExists(location);
  fs.writeFileSync(location, data);
}

export function discoverFiles(basePath: string, clean = true): Array<string> {
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

export function staticRouter(
  assets: string[]
): { status: number; path: string; location: string }[] {
  let routes = [];

  for (let asset of assets) {
    if (
      asset.endsWith('/index.html') ||
      asset.endsWith('/index.htm') ||
      asset.endsWith('/index.xhtml')
    ) {
      let assetPath = asset.split('/');
      assetPath[assetPath.length - 1] = '';

      routes.push({ status: 308, path: assetPath.join('/'), location: asset });
    }
  }

  return routes;
}
