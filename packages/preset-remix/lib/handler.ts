import {
  type ServerBuild,
  createRequestHandler,
} from '@remix-run/server-runtime';

//@ts-ignore
import * as build from './index.js';

export function handler(request) {
  return createRequestHandler(build as unknown as ServerBuild)(request);
}
