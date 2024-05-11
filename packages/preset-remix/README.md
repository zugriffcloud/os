# @zugriff/preset-remix

This package is part of the [zugriff](https://zugriff.eu) ecosystem.

## Usage

```zsh
npm i --save-dev @zugriff/preset-remix
```

```js
import { vitePlugin as remix } from '@remix-run/dev';
import { installGlobals } from '@remix-run/node';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vite';

import preset from '@zugriff/preset-remix';

installGlobals();

export default defineConfig({
  plugins: [
    remix({
      presets: [preset()],
    }),
    tsconfigPaths(),
  ],
});
```
