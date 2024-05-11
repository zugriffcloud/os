# @zugriff/cryptography

This package is part of the [zugriff](https://zugriff.eu) ecosystem. It benefits from a direct integration on our systems and falls back to WASM on yours.

`@zugriff/cryptography` adheres to the [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) minimum requirements. Hashes are returned [PHC](https://github.com/P-H-C/phc-string-format) formatted.

## Usage

```zsh
npm i --save @zugriff/cryptography
```

### Argon2

_Recommended_

```ts
import { argon2id } from '@zugriff/cryptography';

// Create account
const password = await argon2id.hash('password'); // $argon2id$v=19..

// Login
await argon2id.verify('password', password); // true
```

### Scrypt

```ts
import { scrypt } from '@zugriff/cryptography';

// Create account
const password = await scrypt.hash('password'); // $scrypt$ln=17..

// Login
await scrypt.verify('password', password); // true
```
