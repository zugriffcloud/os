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
  "puppets": { "/": "/index.html" }
}
```

## Redirects

Traditional redirects can be configured as follows.

```json
{
  ...
  "redirects": [{ "status": 308, "path": "/", "location": "/index.html" }]
}
```

## Interceptors

Similar to puppets, interceptors resolve to a static asset. In contrast to puppets, interceptors run after
resolving puppets and static assets, redirects and functions and only apply to requests with a dynamic
response. (e.g. unspecified static assets and function responses)

```json
{
  ...
  "interceptors": [{ "status": 404, "path": "/404.html", "method": "GET" }]
}
```
