# @zugriff/postgres

This package is part of the [zugriff](https://zugriff.eu) ecosystem. It runs on both Edge Runtimes using the `fetch` API and your machine using the `fetch` API or the [`postgres`](https://www.npmjs.com/package/postgres) package.

## Usage

```zsh
npm i --save @zugriff/postgres
```

### Creating a client

```ts
import { Postgres } from '@zugriff/postgres';

const client = new Postgres(
  process.env.ZUGRIFF_POSTGRES_TOKEN || {
    host: 'localhost',
    port: 5432,
    username: 'root',
    password: 'root',
    database: 'zugriff',
  }
);
```

### Executing a stament

```ts
// Prepare the database
await client.execute`
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name VARCHAR(256),
    age INTEGER,
    misc JSON
  )
`;

// Insert a user
await client.execute`
  INSERT INTO users (name, age, misc)
    VALUES (${'Luca'}, ${1}, ${{ hello: 'world' }})
`;
```

### Querying the database

```ts
let user = client.query<{
  name: string;
  age: number;
  misc: Object;
}>`
  SELECT name, age, misc
  FROM users
  WHERE
    name=${'Luca'}
`;

// { anchor: "id", success: [{name: "Luca", age: 1, misc: { hello: "world" }}] }
```
