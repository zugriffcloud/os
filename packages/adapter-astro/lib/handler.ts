import type { SSRManifest } from 'astro';
import { App } from 'astro/app';

export function createExports(manifest: SSRManifest) {
  const app = new App(manifest);

  const handler = (request: Request, context) => {
    Reflect.set(
      request,
      Symbol.for('astro.clientAddress'),
      request.headers.get('x-forwarded-for')
    );
    return app.render(request, {
      addCookieHeader: true,
    });
  };

  return { handler };
}
