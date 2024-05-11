import type { EntryContext } from "@remix-run/server-runtime";
import { RemixServer } from "@remix-run/react";
import { renderToReadableStream } from "@zugriff/preset-remix/render";

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
): Promise<Response> {
  const body = await renderToReadableStream(
    <RemixServer context={remixContext} url={request.url} />
  );

  responseHeaders.set('content-type', 'text/html');
  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
