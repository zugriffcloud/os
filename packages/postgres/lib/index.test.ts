import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Postgres, parseQuery } from '$lib/index';

describe('successfully parses sql statements with or without parameters', () => {
  it('parses query with no parameters', () => {
    expect(parseQuery(["SELECT 'HELLO WORLD'"], [])).toStrictEqual({
      query: "SELECT 'HELLO WORLD'",
      params: [],
    });
  });

  it('parses a query with a single parameter', () => {
    expect(parseQuery(['SELECT ', ''], [1])).toStrictEqual({
      query: 'SELECT $1',
      params: [1],
    });
  });

  it('parses a query with multiple parameters', () => {
    expect(
      parseQuery(['SELECT ', ', ', ' FROM test'], [1, 'Hello World!'])
    ).toStrictEqual({
      query: 'SELECT $1, $2 FROM test',
      params: [1, 'Hello World!'],
    });
  });

  it('coerce a parameter type', () => {
    expect(parseQuery(['SELECT ', ''], [1], true)).toStrictEqual({
      query: 'SELECT $1::TEXT',
      params: [1],
    });
  });
});

describe('database calls', async () => {
  const client = new Postgres(
    process.env.ZUGRIFF_POSTGRES_TOKEN || {
      host: 'localhost',
      port: 5432,
      username: 'root',
      password: 'root',
      database: 'zugriff',
    }
  );

  beforeAll(async () => {
    await client.execute`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        name VARCHAR(256),
        age INTEGER,
        married BOOLEAN,
        misc JSON
      )
    `;
  });

  it('adds a user', async () => {
    expect(
      await client.execute`INSERT INTO users (name, age, married, misc) VALUES (${'Luca'}, ${1}, ${false}, ${{ likesSQL: true }})`
    ).toMatchObject({
      data: [],
    });
  });

  it('retreives a user', async () => {
    expect(
      await client.query<{
        name: string;
        age: number;
        married: boolean;
        misc: NonNullable<unknown>;
      }>`SELECT name, age, married, misc FROM users WHERE name=${'Luca'}`
    ).toMatchObject({
      data: [
        { name: 'Luca', age: 1, married: false, misc: { likesSQL: true } },
      ],
    });
  });

  it('returns any value', async () => {
    expect(await client.query`SELECT ${1}`).toMatchObject({
      data: [{ text: '1' }],
    });
  });

  afterAll(async () => {
    await client.execute`
      DROP TABLE users
    `;
  });
});
