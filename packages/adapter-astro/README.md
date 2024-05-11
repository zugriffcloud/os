# @zugriff/adapter-astro

This package is part of the [zugriff](https://zugriff.eu) ecosystem.

## Usage

```zsh
npm i --save-dev @zugriff/adapter-astro
```

```js
import adapter from '@zugriff/adapter-astro';

export default defineConfig({
  output: 'server', // 'static' | 'server' | 'hybrid'
  adapter: adapter(),
});
```
