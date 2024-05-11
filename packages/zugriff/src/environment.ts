import { homedir, platform } from 'node:os';
import { join } from 'node:path';

export let zugriffHomeFolder = join(homedir(), '.zugriff-npm');
export let binaryLocation = join(
  zugriffHomeFolder,
  platform() == 'win32' ? 'zugriff.exe' : 'zugriff'
);
