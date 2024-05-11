# @zugriff/mailman

This package is part of the [zugriff](https://zugriff.eu) ecosystem. It runs on both Edge Runtimes using the `fetch` API and your machine using the `fetch` API or the [`nodemailer`](https://www.npmjs.com/package/nodemailer) package.

## Usage

```zsh
npm i --save @zugriff/mailman
```

### Creating a client

```ts
import { Mailman, Mail, Contact, Message } from '@zugriff/mailman';

// SMTP Client
const client = new Mailman(
  process.env.ZUGRIFF_MAILMAN_TOKEN || {
    host: 'localhost',
    port: 465,
    auth: {
      user: 'hello.world@zugriff.eu',
      pass: 'password',
    },
    requireTLS: true,
  }
);
```

### Sending an email

```ts
await client.send(
  new Mail({
    to: new Contact({
      name: 'Max Mustermann',
      address: 'max.mustermann@example.com',
    }),
    from: new Contact('erika.mustermann@example.com'),
    subject: 'Welcome',
    message: new Message('Hi, Max! Thank you for signing up.'),
  })
); // { anchor: "id", success: true }
```
