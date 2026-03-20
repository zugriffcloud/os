# @zugriff/preset-nitro

This package is part of the [zugriff](https://zugriff.eu) ecosystem.

## Usage

```zsh
npm i --save-dev @zugriff/preset-nitro@beta
```

### SolidStart

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { nitro } from 'nitro/vite';

import { solidStart } from '@solidjs/start/config';

export default defineConfig({
  plugins: [
    solidStart(),
    nitro({
      preset: './node_modules/@zugriff/preset-nitro',
    }),
  ],
});
```

### vinext (Next.js)

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import vinext from 'vinext';
import { nitro } from 'nitro/vite';

export default defineConfig({
  plugins: [
    vinext(),
    nitro({ preset: './node_modules/@zugriff/preset-nitro' }),
  ],
});
```

### Nuxt

Please use the previous major version of `@zugriff/preset-nitro` with the current major version of `nuxt`, `nuxt@4`.
