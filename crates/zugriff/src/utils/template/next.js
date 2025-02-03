import func from '<HANDLER>';

export function handler(event) {
  return func(event, {
    waitUntil: async (promise) => {
      return await promise;
    },
    passThroughOnException: () => {},
  });
}
