# @zugriff/adapter-sveltekit

This package is part of the [zugriff](https://zugriff.eu) ecosystem.

## Usage

```zsh
npm i --save-dev @zugriff/adapter-sveltekit
```

```js
import adapter from '@zugriff/adapter-sveltekit';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  ...
	kit: {
    ...
		adapter: adapter(),
	},
};

export default config;
```
