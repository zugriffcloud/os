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
  let exists: Promise<boolean> = new Promise((resolve) => (resolver = resolve));
  fs.lstat(location, (err, stats) => {
    if (err || !stats.isFile()) {
      return resolver(false);
    }
    resolver(true);
  });

  return await exists;
}

let packageJson: object;

export async function hasDependency(dependency: string) {
  let resolver;
  let has: Promise<boolean | 'unknown'> = new Promise(
    (resolve) => (resolver = resolve)
  );

  if (packageJson) {
    if (
      'dependencies' in packageJson &&
      typeof packageJson.dependencies == 'object' &&
      dependency in packageJson.dependencies
    ) {
      resolver(true);
    } else {
      resolver(false);
    }

    return await has;
  }

  if (await doesFileExist('package.json')) {
    fs.readFile('package.json', (err, data) => {
      if (err) return resolver('unknown');

      try {
        let value = JSON.parse(data.toString());
        if (
          'dependencies' in value &&
          typeof value.dependencies == 'object' &&
          dependency in value.dependencies
        ) {
          resolver(true);
        } else {
          resolver(false);
        }
      } catch (_) {
        resolver('unknown');
      }
    });
  }

  return await has;
}
