import { cwd, exit } from 'node:process';
import { spawn } from 'node:child_process';

import { binaryLocation } from '$src/environment';

let resolver: ((code: number) => void) | undefined;
let output = new Promise<number>((resolve) => (resolver = resolve));

let args = process.argv.slice(2);

if (
  args.join(' ').includes('uninstall') &&
  !args.join(' ').includes('--help') &&
  !args.join(' ').includes('-h')
) {
  console.info(
    'Please consider using your package manager to clean up files this binary did not download or create.'
  );
}

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

exit(code);
