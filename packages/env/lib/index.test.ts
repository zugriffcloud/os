import { beforeAll, describe, expect, it } from 'vitest';
import { loadEnvironment } from '$lib/index';

describe('loads environment variables', async () => {
  beforeAll(async () => {
    await loadEnvironment({ path: '.env.test' });
  });

  it('check for "HELLO"', () => {
    expect(process.env.HELLO).toBe('WORLD');
  });
});
