import * as fs from 'node:fs';
import { spawn } from 'node:child_process';

if (await doesFileExist('./.zugriff_no_postinstall')) {
  process.exit();
}

async function doesFileExist(location) {
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

let resolver;
let output = new Promise((resolve) => (resolver = resolve));

let child = spawn('node', './dist/install.mjs', {
  cwd: process.cwd(),
  stdio: 'pipe',
});

child.stdout.on('data', (data) => {
  process.stdout.write(data);
});

child.stderr.on('data', (data) => {
  process.stderr.write(data);
});

child.on('exit', (code) => {
  resolver(code);
});

process.exit(await output);
