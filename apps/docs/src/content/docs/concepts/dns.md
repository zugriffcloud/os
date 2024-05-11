---
title: 'DNS'
---

:::caution
`www.example.com` is a subdomain of `example.com` and needs to be set up separately.
:::

To access your projects from a custom domain, you need to add a [`CNAME`](https://de.wikipedia.org/wiki/CNAME_Resource_Record)
record to the DNS configuration of your domain before adding it to your project.

| Location | Address           |
| :------- | :---------------- |
| \*       | dns.zugriff.eu    |
| Germany  | de.dns.zugriff.eu |
| Finland  | fi.dns.zugriff.eu |

With this configuration, you benefit from Global Server Load Balancing (GSLB) and will resolve DNS requests to the server closest to a user.

- [Hetzner (Managing CNAME records)](https://docs.hetzner.com/dns-console/dns/manage-records/managing-cname-records/)
- [Strato (Wie kann ich den CNAME-Record konfigurieren?)](https://www.strato.de/faq/domains/wie-kann-ich-bei-strato-meine-dns-eintraege-verwalten/#cname)
- [IONOS (CNAME-Record für eine bestehende Subdomain konfigurieren)](https://www.ionos.de/hilfe/domains/cname-records-fuer-subdomains-konfigurieren/cname-record-fuer-eine-bestehende-subdomain-konfigurieren/)
- [GoDaddy (Add a CNAME record)](https://www.godaddy.com/help/add-a-cname-record-19236)
- [Namecheap (How to Create a CNAME Record For Your Domain)](https://www.namecheap.com/support/knowledgebase/article.aspx/9646/2237/how-to-create-a-cname-record-for-your-domain/)

:::note
You may also point your domain to an IPv4 (A) or IPv6 (AAAA) address.  
**We do not recommend doing this, as addresses might change or locations removed over time.**

| Location          | IPv4           | IPv6                  |
| :---------------- | :------------- | :-------------------- |
| Germany, Nürnberg | 116.203.1.254  | 2a01:4f8:1c0c:b00b::1 |
| Finland, Helsinki | 65.109.243.233 | 2a01:4f9:c01f:96::1   |

:::
