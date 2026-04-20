---
title: 'Pre- And Postprocessors'
---

:::note
Defining pre- and postprocessors might make migrating to another hosting provider more challenging.
:::

To throw more efficient redirects or access a specific static asset through an alias, adjust the
configuration of your deployment.

## Preprocessors

Preprocessors, including puppets and redirects, will receive the incoming encoded request path
without a trailing slash.

### Puppets

Puppets will, instead of redirecting the user, resolve a static asset.

```json
{
  ...
  "preprocessors": {
    "puppets": {
      "/": "/index.html"
    }
  }
}
```

```sh
zugriff deploy ... --puppet /:/index.html
```

### Redirects

Traditional redirects can be configured as follows.

```json
{
  ...
  "preprocessors": {
    "redirects": [
      {
        "status": 308,
        "path": "/",
        "location": "/index.html"
      }
    ]
  }
}
```

```sh
zugriff deploy ... --redirect /:308:/index.html
```

## Postprocessors

### Interceptors

Similar to puppets, interceptors resolve to a static asset. In contrast to puppets, interceptors run
after resolving puppets, static assets, redirects, and functions, and apply only to requests with a
dynamic response. (e.g. unspecified static assets and function responses)

```json
{
  ...
  "postprocessors": {
    "interceptors": [
      {
        "status": 404,
        "path": "/404.html",
        "method": "GET"
      }
    ]
  }
}
```

```sh
zugriff deploy ... --intercept 404:GET:/404.html
```
