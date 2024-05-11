import { rmSync } from 'node:fs';
import { cwd, exit } from 'node:process';
import { spawn } from 'node:child_process';

import { binaryLocation, zugriffHomeFolder } from '$src/environment';

let resolver: ((code: number) => void) | undefined;
let output = new Promise<number>((resolve) => (resolver = resolve));

let args = process.argv.slice(2);

let child = spawn(binaryLocation, args, {
  cwd: cwd(),
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

let code = await output;

if (
  args.join(' ').includes('uninstall') &&
  !args.join(' ').includes('--help') &&
  !args.join(' ').includes('-h')
) {
  rmSync(zugriffHomeFolder, { recursive: true, force: true });
}

exit(code);
