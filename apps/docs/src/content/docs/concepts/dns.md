---
title: 'DNS'
---

:::caution
`www.example.com` is a subdomain of `example.com` that requires a separate setup.
:::

To access your projects from a custom domain, you can add an `ALIAS`, also known as `ANAME`, or [`CNAME`](https://de.wikipedia.org/wiki/CNAME_Resource_Record)
record to the DNS configuration of your domain.

| Location | Address           |
| :------- | :---------------- |
| \*       | dns.zugriff.eu    |
| Germany  | de.dns.zugriff.eu |
| Finland  | fi.dns.zugriff.eu |

:::note
You may also point your domain to an IPv4 (A) or IPv6 (AAAA) address.  
**We might change addresses over time, and you will not profit from Global Server Load Balancing (GSLB).**

| Location             | IPv4           | IPv6                  |
| :------------------- | :------------- | :-------------------- |
| Germany, Falkenstein | 188.245.63.105 | 2a01:4f8:c013:540c::1 |
| Finland, Helsinki    | 89.167.25.143  | 2a01:4f9:c011:b113::1 |

:::

## When `ALIAS` and `CNAME` records are not an option

At times, setting up a `CNAME` record may be disadvantageous or even impossible. Instead, you can set up an `A` or `AAAA` record.  
To still benefit from GSLB, you can connect your domain to a deployment (e.g. your first deployment) that throws a permanent redirect to a domain
configured with a dynamic record. Please see the example below.

```js
export function handler(request) {
  let url = new URL(request.url);
  url.host = 'www.yourdomain.com';
  return new Response(null, {
    status: 308,
    headers: { Location: url.toString() },
  });
}
```
