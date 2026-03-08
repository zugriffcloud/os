import '#nitro/virtual/polyfills';
import { useNitroApp } from 'nitro/app';

const nitroApp = useNitroApp();

async function handler(request: Request): Promise<Response> {
  return await nitroApp.fetch(request);
}

export { handler };
