import { describe, expect, test } from 'vitest';
import { hash, verify } from '$lib/argon2id';

test('computes an argon2id hash of a password', async () => {
  expect(await hash('password')).toContain('$argon2id$v=19$');
});

describe('compares an argon2id hash of a password with a password', () => {
  test('matching passwords', async () => {
    expect(await verify('password', await hash('password'))).toBe(true);
  });

  test('different passwords', async () => {
    expect(await verify('password2', await hash('password'))).toBe(false);
  });
});
