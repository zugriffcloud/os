import * as fs from 'node:fs';
import * as path from 'node:path';

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
  basePath = basePath.replace(/\/[cC]:/, '');

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

export async function doesFileExist(location) {
  let resolver;
  let exists = new Promise((resolve) => (resolver = resolve));
  fs.lstat(location, (err, stats) => {
    if (err || !stats.isFile()) {
      return resolver(false);
    }
    resolver(true);
  });

  return await exists;
}
