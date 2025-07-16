import * as fs from 'node:fs';

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
        packageJson = value;
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
