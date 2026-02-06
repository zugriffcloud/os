import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export async function isDirectory(path: string): Promise<boolean> {
  try {
    let stat = await fs.stat(path);
    return stat.isDirectory();
  } catch (error) {
    return false;
  }
}

export async function isFile(path: string): Promise<boolean> {
  try {
    let stat = await fs.stat(path);
    return stat.isFile();
  } catch (error) {
    return false;
  }
}

export async function discoverFiles(
  basePath: string,
  clean = true
): Promise<Array<string>> {
  let files: Array<string> = [];

  for (const discovery of await fs.readdir(basePath)) {
    const fullFilePath = path.join(basePath, discovery);
    const discoveryStats = await fs.lstat(fullFilePath);

    if (discoveryStats.isDirectory()) {
      files = files.concat(await discoverFiles(fullFilePath, false));
    } else {
      files.push(path.posix.join(basePath.replace(/\\/g, '/'), discovery));
    }
  }

  if (clean) files = files.map((file) => file.substring(basePath.length));

  return files;
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

  if (await isFile('package.json')) {
    const data = await fs.readFile('package.json');
    packageJson = JSON.parse(data.toString()) ?? {};
    return await hasDependency(dependency);
  }
}
