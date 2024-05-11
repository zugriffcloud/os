---
title: 'Environments'
---

:::note
The key of an environment variable must be unique across a project.  
:::

Each project has a default environment which is shared across all domains. To scope the access of a domain to a
specific environment variable, you must create a new environment and connect it.

Changes to an environment do not require a re-deployment in most cases.

## Example

You have a project with a b2b and b2c environment. Both the domain for the b2b and the b2c environment are
connected to the same project and were promoted to serve requests from the same deployment.

When clients search for a product, you need to query separate databases. This can be as easy as setting up
two different [proxies](/ecosystem/addons/postgres/) and scoping the API tokens to an environment connected with a
domain. Eventually, you could set up your SQL client as follows.

```ts
import { Postgres } from '@zugriff/postgres';

const client = new Postgres(
  process.env.B2B_POSTGRES_TOKEN || process.env.B2C_POSTGRES_TOKEN
);
```
