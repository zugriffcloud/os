---
title: About
description: What zugriff is. What zugriff can do. What zugriff cannot do.
---

With zugriff, you can deploy your web applications and APIs on the edge, close to your users. All without compromising on
GDPR, developer experience and performance.

Supporting both dynamic and static content, our internal router will decide whether we return a static or dynamic response.
Furthermore, if required to comply with local laws, you can choose what locations may serve your requests. By default, your
application and environment variables are lazily cached on edge nodes.

To server-side-render your requests as efficiently as possible, we use our own [JavaScript Runtime](/reference/runtime-apis)
as an alternative to [NodeJS](https://nodejs.org). This allows us to almost eliminate cold-starts.  
Leveraging [V8](https://v8.dev) isolates, sandboxed JavaScript execution environments, we protect your execution environment
from others we host.  
Learn more about [supported APIs](/reference/runtime-apis),
[Node.js compatibility](/reference/runtime-apis/#nodejs-compatibility) and our ecosystem of vendor-lock-free proxies to send
[emails](/ecosystem/addons/smtp) and communicate with [databases](/ecosystem/addons/postgres) or
[key-value stores](/ecosystem/addons/redis).

## Highlights

- [GDPR compliant](/introduction/sovereignty/#gdpr-compliance)
- Regional Deployments
- Response Streaming (e.g. stream GPT output)
- Scale To Zero
- Vendor-lock-in-free [ecosystem](/ecosystem)
- [Integrations (Next.js, SvelteKit, Astro, GitHub Actions, …)](/ecosystem/integrations)
- Self-hosting (Please get in touch)
- Rust: JavaScript Runtime
