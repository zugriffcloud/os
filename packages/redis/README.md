# @zugriff/redis

This package is part of the [zugriff](https://zugriff.eu) ecosystem. It runs on both Edge Runtimes using the `fetch` API and your machine using the `fetch` API or the [`ioredis`](https://www.npmjs.com/package/ioredis) package.

## Usage

```zsh
npm i --save @zugriff/redis
```

### Creating a client

```ts
import { Redis } from '@zugriff/redis';

const client = new Redis(
  process.env.ZUGRIFF_REDIS_TOKEN || {
    host: 'localhost',
    port: 6379,
  }
);
```

### Executing a command

```ts
await client.cmd('SET', 'number', 1); // { anchor: 'id', data: 'OK' }
await client.cmd('SET', 'json', { hello: 'world' }); // { anchor: 'id', data: 'OK' }
```

### Querying a value

```ts
const value = await client.cmd<number>('GET', 'number'); // { anchor: 'id', data: 1 }
```

```ts
const value = await client.cmd<{ hello: string }>('GET', 'json'); // { anchor: 'id', data: { hello: 'world' } }
```
