# @zugriff/env

This package is part of the [zugriff](https://zugriff.eu) ecosystem. It runs on your machine using the [`dotenv`](https://www.npmjs.com/package/dotenv) package and on Edge Runtimes using a vendor-native approach.

## Usage

```zsh
npm i --save @zugriff/env
```

### Loading Environment Variables

```ts
import { loadEnvironment } from '@zugriff/env';

await loadEnvironment();

console.log(process.env.HELLO);
```

You can also retreive environment variables from a specific location by providing a `dotenv` configuration object.

```ts
await loadEnvironment({ path: '.env.development' });
```
