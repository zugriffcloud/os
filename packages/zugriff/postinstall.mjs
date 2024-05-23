import { spawn } from 'node:child_process';

import * as path from 'node:path';

const postinstall = process.env.ZUGRIFF_SKIP_POSTINSTALL;

if (
  postinstall &&
  (postinstall == '1' || postinstall.toLowerCase() == 'true')
) {
  process.exit();
}

let resolver;
let output = new Promise((resolve) => (resolver = resolve));

let child = spawn('node', [path.join('.', 'dist', 'install.mjs')], {
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
