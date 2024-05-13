---
title: 'DNS'
---

:::caution
`www.example.com` is a subdomain of `example.com` and needs to be set up separately.
:::

To access your projects from a custom domain, you can add a [`CNAME`](https://de.wikipedia.org/wiki/CNAME_Resource_Record)
record to the DNS configuration of your domain.

| Location | Address           |
| :------- | :---------------- |
| \*       | dns.zugriff.eu    |
| Germany  | de.dns.zugriff.eu |
| Finland  | fi.dns.zugriff.eu |

Find information on how to set up a `CNAME` record below.

- [Hetzner (Managing CNAME records)](https://docs.hetzner.com/dns-console/dns/manage-records/managing-cname-records/)
- [Strato (Wie kann ich den CNAME-Record konfigurieren?)](https://www.strato.de/faq/domains/wie-kann-ich-bei-strato-meine-dns-eintraege-verwalten/#cname)
- [IONOS (CNAME-Record für eine bestehende Subdomain konfigurieren)](https://www.ionos.de/hilfe/domains/cname-records-fuer-subdomains-konfigurieren/cname-record-fuer-eine-bestehende-subdomain-konfigurieren/)
- [GoDaddy (Add a CNAME record)](https://www.godaddy.com/help/add-a-cname-record-19236)
- [Namecheap (How to Create a CNAME Record For Your Domain)](https://www.namecheap.com/support/knowledgebase/article.aspx/9646/2237/how-to-create-a-cname-record-for-your-domain/)

:::note
You may also point your domain to an IPv4 (A) or IPv6 (AAAA) address.  
**We might change addresses over time, and you will not profit from Global Server Load Balancing (GSLB).**

| Location          | IPv4           | IPv6                  |
| :---------------- | :------------- | :-------------------- |
| Germany, Nürnberg | 116.203.1.254  | 2a01:4f8:1c0c:b00b::1 |
| Finland, Helsinki | 65.109.243.233 | 2a01:4f9:c01f:96::1   |

:::

## When `CNAME` records are not an option

At times, setting up a `CNAME` record might be disadvantageous or not possible at all. Instead, you can set up an `A` or `AAAA` record.  
To still benefit from GSLB, you can connect your domain to a deployment (e.g. your first deployment) that throws a permanent redirect to a domain
set up with a `CNAME` record. Please see the example below.

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
