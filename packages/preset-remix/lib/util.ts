import * as fs from 'node:fs';
import * as path from 'node:path';

export async function doesFileExist(location: string): Promise<boolean> {
  let resolver: (value: boolean) => void;
  let exists = new Promise((resolve) => (resolver = resolve));
  fs.lstat(location, (err, stats) => {
    if (err || (stats && !stats.isFile())) {
      resolver(false);
      return;
    }
    resolver(true);
  });

  return (await exists) as boolean;
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
