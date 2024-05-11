---
title: 'Caching'
---

The scope of distribution of deployments is derived from connected domains and their DNS [configuration](/concepts/dns).

By default and for security reasons, deployments and environment variables are not always cached on every server.
Instead, once a request hits a server, the deployment is initialised. Files are downloaded, and environment variables
are fetched from a vault. After a phase of inactivity, a deployment is evicted if not connected to a custom domain.
Similarly, associated environment variables are evicted if unused.

Execution environments - sandboxes, due to their more considerable use of system resources, are evicted after a shorter
phase of inactivity. A request hitting a deployment without a sandbox will not trigger a whole new initialisation of a
deployment. Instead, a new execution environment is set up in a couple of negligible milliseconds.
