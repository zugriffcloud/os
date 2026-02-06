import type { AppLoadContext, EntryContext } from 'react-router';
import { ServerRouter } from 'react-router';
//@ts-ignore
import { renderToReadableStream } from 'react-dom/server.edge';


export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  _loadContext: AppLoadContext,
) {
  const body = await renderToReadableStream(<ServerRouter context={routerContext} url={request.url} />);

  responseHeaders.set('Content-Type', 'text/html');
  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
