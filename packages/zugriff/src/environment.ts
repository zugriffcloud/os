import { platform } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export let zugriffHomeFolder = dirname(fileURLToPath(import.meta.url));
export let binaryLocation = join(
  zugriffHomeFolder,
  platform() == 'win32' ? 'zugriff.exe' : 'zugriff'
);
