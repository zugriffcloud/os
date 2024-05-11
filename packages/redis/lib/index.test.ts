import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Redis } from '$lib/index';

describe('database calls', () => {
  const client = new Redis(
    process.env.ZUGRIFF_REDIS_TOKEN || {
      host: 'localhost',
      port: 6379,
      db: 2,
    }
  );

  beforeAll(async () => {
    await client.cmd('SET', 'number', 1);
    await client.cmd('SET', 'boolean', true);
    await client.cmd('SET', 'json', { hello: 'world' });
    await client.cmd('SET', 'string', 'Hello World!');
    await client.cmd(
      'SET',
      'coerce',
      JSON.stringify([1, true, 'Hello World!'])
    );
  });

  it('returns a number', async () => {
    expect(await client.cmd<number>('GET', 'number')).toMatchObject({
      data: 1,
    });
  });

  it('return a boolean', async () => {
    expect(await client.cmd<boolean>('GET', 'boolean')).toMatchObject({
      data: true,
    });
  });

  it('returns json', async () => {
    expect(await client.cmd<{ hello: string }>('GET', 'json')).toMatchObject({
      data: { hello: 'world' },
    });
  });

  it('returns a string', async () => {
    expect(await client.cmd<{ hello: string }>('GET', 'string')).toMatchObject({
      data: 'Hello World!',
    });
  });

  it('returns a coerced json value', async () => {
    expect(
      await client.cmd<[number, boolean, string]>('GET', 'coerce')
    ).toMatchObject({
      data: [1, true, 'Hello World!'],
    });
  });

  it('returns null', async () => {
    expect(await client.cmd('GET', 'abc')).toMatchObject({
      data: null,
    });
  });

  it('returns OK', async () => {
    expect(await client.cmd('SET', 'number', 1)).toMatchObject({
      data: 'OK',
    });
  });

  afterAll(async () => {
    await client.cmd('DEL', 'number', 'boolean', 'json', 'string', 'coerce');
  });
});
