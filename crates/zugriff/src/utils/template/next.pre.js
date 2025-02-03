// MIT licensed
// https://github.com/cloudflare/next-on-pages/blob/2cd4c3c704a00e6b693229f1f14102abc6318d11/packages/next-on-pages/templates/_worker.js/routesIsolation.ts

globalThis.__nextOnPagesRoutesIsolation = {
  _map: new Map(),
  getProxyFor,
};

function getProxyFor(route) {
  const existingProxy = globalThis.__nextOnPagesRoutesIsolation._map.get(route);
  if (existingProxy) {
    return existingProxy;
  }

  const newProxy = createNewRouteProxy();
  globalThis.__nextOnPagesRoutesIsolation._map.set(route, newProxy);
  return newProxy;
}

function createNewRouteProxy() {
  const overrides = new Map();

  return new Proxy(globalThis, {
    get: (_, property) => {
      if (overrides.has(property)) {
        return overrides.get(property);
      }
      return Reflect.get(globalThis, property);
    },
    set: (_, property, value) => {
      if (sharedGlobalProperties.has(property)) {
        // this property should be shared across all routes
        return Reflect.set(globalThis, property, value);
      }
      overrides.set(property, value);
      return true;
    },
  });
}

const sharedGlobalProperties = new Set([
  '_nextOriginalFetch',
  'fetch',
  '__incrementalCache',
]);
