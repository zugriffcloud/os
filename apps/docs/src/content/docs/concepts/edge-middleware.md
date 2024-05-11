---
title: 'Edge Middleware'
---

To throw more efficient redirects or access a specific static asset from an alias, rules can be set up
within the configuration file of your deployment.

## Puppets

Puppets will, instead of redirecting the user, resolve a static asset.

```json
{
  ...
  puppets: { "/": "/index.html" }
}
```

## Redirects

Traditional redirects can be configured as follows.

```json
{
  ...
  redirects: [{ status: 308, path: "/", location: "/index.html" }]
}
```
