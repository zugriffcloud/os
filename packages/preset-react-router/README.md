# @zugriff/preset-react-router

This package is part of the [zugriff](https://zugriff.eu) ecosystem.

## Usage

```zsh
npm i --save-dev @zugriff/preset-react-router
```

```ts
// entry.server.tsx
export { default } from '@zugriff/preset-react-router/entry.server.tsx';
```

```ts
// react-router.config.ts
import type { Config } from '@react-router/dev/config';
import preset from '@zugriff/preset-react-router';

export default {
  // Config options...
  // Server-side render by default, to enable SPA mode set this to `false`
  ssr: true,
  presets: [preset()],
} satisfies Config;
```
