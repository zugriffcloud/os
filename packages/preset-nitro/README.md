# @zugriff/preset-nitro

This package is part of the [zugriff](https://zugriff.eu) ecosystem.

## Usage

```zsh
npm i --save-dev @zugriff/preset-nitro
```

### Nuxt

```ts
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  nitro: {
    preset: './node_modules/@zugriff/preset-nitro',
  },
  devtools: { enabled: true },
});
```

### SolidStart

```ts
import { defineConfig } from '@solidjs/start/config';

export default defineConfig({
  server: {
    compressPublicAssets: false,
    preset: './node_modules/@zugriff/preset-nitro',
  },
});
```
