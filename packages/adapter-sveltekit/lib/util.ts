import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export async function isFile(location): Promise<boolean> {
  try {
    const stat = await fs.stat(location);
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
    const data = await fs.readFile('package.json');
    packageJson = JSON.parse(data.toString());
    return await hasDependency(dependency);
  }

  return 'unknown';
}
