---
title: 'Pre- And Postprocessors'
---

:::note
Defining pre- and postprocessors might make migrating to another hosting provider more challenging.
:::

To throw more efficient redirects or access a specific static asset from an alias, rules can be set up
within the configuration file of your deployment.

## Preprocessors

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

### Guards

Guards protect both your functions and assets from unauthorised access.
Find information on pattern matching [here](/reference/deployment-architecture#patterns).

```json
{
  ...
  "preprocessors": {
    "guards": [
      {
        "credentials": {
          "username": "SHA3-384 Base64 encoded value",
          "password": "SHA3-384 Base64 encoded value (nullable)"
        },
        "scheme": "basic",
        "patterns": ["*"]
      }
    ]
  }
}
```

## Postprocessors

### Interceptors

Similar to puppets, interceptors resolve to a static asset. In contrast to puppets, interceptors run after
resolving puppets and static assets, redirects and functions and only apply to requests with a dynamic
response. (e.g. unspecified static assets and function responses)

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
