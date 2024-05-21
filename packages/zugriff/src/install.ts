import { exit } from 'node:process';
import { arch, platform } from 'node:os';
import { createWriteStream, chmod, rmSync } from 'node:fs';
import { finished } from 'node:stream/promises';
import { Readable } from 'node:stream';

import { version } from '../package.json';

import * as semver from 'semver';
import { Octokit } from 'octokit';
import { temporaryFile } from 'tempy';
import * as yauzl from 'yauzl';
import * as tar from 'tar';

import { binaryLocation, zugriffHomeFolder } from '$src/environment';

let authBearer: string | undefined = undefined;

const octokit = new Octokit({
  auth: authBearer,
});

function unsupported() {
  console.error('Unable to find prebuilt binary for platform or architecture');
  exit(1);
}

let binaryLookup = {
  darwin: {
    arm: 'darwin-aarch64.tar.gz',
    x64: 'darwin-x86_64.tar.gz',
  },
  win32: {
    arm: 'windows-aarch64.zip',
    x64: 'windows-x86_64.zip',
  },
  freebsd: {
    x64: 'freebsd-x86_64.tar.gz',
  },
  linux: {
    arm: 'linux-aarch64-musl.tar.gz',
    x64: 'linux-x86_64-musl.tar.gz',
  },
};

let binaryEnding = binaryLookup[platform()][arch()];

if (binaryEnding == undefined) {
  unsupported();
}

const releases = await octokit.request('GET /repos/{owner}/{repo}/releases', {
  owner: 'zugriffcloud',
  repo: 'os',
});

let latestRelease: (typeof releases.data)[0];

for (let release of releases.data) {
  if (release.tag_name.startsWith('crates-zugriff-')) {
    if (
      new Date(latestRelease?.created_at || 0) < new Date(release.created_at)
    ) {
      let tagVersion = release.tag_name.replace('crates-zugriff-', '');
      let cleanTagVersion =
        (tagVersion.match(/([\d\.]{2,}.*)/g) || [])[0] || '';
      if (semver.satisfies(cleanTagVersion, semver.major(version) + '.x')) {
        latestRelease = release;
      }
    }
  }
}

if (latestRelease == undefined) {
  unsupported();
}

let matchingAsset: undefined | (typeof releases.data)[0]['assets'][0] =
  undefined;

for (let asset of latestRelease.assets) {
  if (asset.name.endsWith(binaryEnding)) {
    matchingAsset = asset;
    break;
  }
}

if (matchingAsset == undefined) {
  unsupported();
}

let binaryResponse = await fetch(matchingAsset.url, {
  method: 'GET',
  redirect: 'follow',
  headers: {
    ...(typeof authBearer == 'string'
      ? {
          Authorization: 'Bearer ' + authBearer,
        }
      : {}),
    Accept: 'application/octet-stream',
  },
});

let archiveTempPath = temporaryFile({ name: matchingAsset.name });
let archiveWriteStream = createWriteStream(archiveTempPath, { flags: 'wx' });
await finished(Readable.fromWeb(binaryResponse.body).pipe(archiveWriteStream));
archiveWriteStream.close();

let binaryWriteStream = createWriteStream(binaryLocation);

let resolver: (value: unknown) => void;
let extracted = new Promise((resolve) => (resolver = resolve));

if (matchingAsset.name.endsWith('zip')) {
  yauzl.open(archiveTempPath, { lazyEntries: true }, function (err, zipfile) {
    if (err) throw err;

    zipfile.readEntry();
    zipfile.on('entry', function (entry) {
      if (entry.fileName.endsWith('exe')) {
        zipfile.openReadStream(entry, function (err, readStream) {
          if (err) throw err;

          readStream.on('end', function () {
            zipfile.readEntry();
          });

          readStream.pipe(binaryWriteStream).on('close', () => {
            binaryWriteStream.close(() => {
              resolver(true);
            });
          });
        });
      }
    });
  });
} else {
  await tar.x({
    file: archiveTempPath,
    cwd: zugriffHomeFolder,
  });

  resolver(true);
  rmSync(archiveTempPath);
}

await extracted;

if (platform() != 'win32') {
  await chmod(binaryLocation, 0o755, (error) => {
    if (error instanceof Error) {
      console.error('Unable to change permissions of file', binaryLocation);
      console.error(error);
      process.exit(1);
    }
  });
}
