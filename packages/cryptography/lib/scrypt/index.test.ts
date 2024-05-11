import { expect, test, describe } from 'vitest';
import { hash, verify } from '$lib/scrypt';

test('computes an scrypt hash of a password', async () => {
  expect(await hash('password')).toContain('$scrypt$ln=17,');
});

describe('compares an scrypt hash of a password with a password', () => {
  test('matching passwords', async () => {
    expect(await verify('password', await hash('password'))).toBe(true);
  });

  test('different passwords', async () => {
    expect(await verify('password2', await hash('password'))).toBe(false);
  });
});
