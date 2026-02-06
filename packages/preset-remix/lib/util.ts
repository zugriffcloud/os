import * as fs from 'node:fs';
import * as path from 'node:path';

export function discoverFiles(basePath: string, clean = true): Array<string> {
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

export async function isFile(location): Promise<boolean> {
  try {
    const stat = await fs.promises.stat(location);
    return stat.isFile();
  } catch (_) {
    return false;
  }
}

let packageJson: object;

export async function hasDependency(dependency: string) {
  if (packageJson) {
    return (
      'dependencies' in packageJson &&
      typeof packageJson.dependencies == 'object' &&
      packageJson.dependencies !== null &&
      dependency in packageJson.dependencies
    );
  }

  if (await isFile(path.join('package.json'))) {
    const data = await fs.promises.readFile('package.json');
    packageJson = JSON.parse(data.toString());
    return hasDependency(dependency);
  }

  return 'unknown';
}
