import type { DotenvConfigOptions } from 'dotenv';

export async function loadEnvironment(config: DotenvConfigOptions = {}) {
  if (!('EdgeRuntime' in globalThis)) {
    (await import('dotenv')).default.config(config);
  }
}
