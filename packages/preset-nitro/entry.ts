// @ts-ignore
import { useNitroApp } from '#internal/nitro/app';
import '#internal/nitro/virtual/polyfill';

const nitroApp = useNitroApp();

export default {
  async fetch(request: Request) {
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
