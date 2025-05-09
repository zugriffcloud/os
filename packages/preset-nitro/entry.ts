// @ts-ignore
import { useNitroApp } from 'nitro/runtime';
import '#nitro-internal-pollyfills';

const nitroApp = useNitroApp();

export default {
  async fetch(request) {
    const url = new URL(request.url);

    let body;
    if (request.body) {
      body = await request.arrayBuffer();
    }

    return nitroApp.localFetch(url.pathname + url.search, {
      context: {},
      host: url.hostname,
      protocol: url.protocol,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body,
    });
  },
};
