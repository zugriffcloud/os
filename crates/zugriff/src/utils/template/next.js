import func from '<HANDLER>';

export function handler(event) {
  return func(event, {
    waitUntil: async (_) => {
      return Promise.resolve();
    },
    passThroughOnException: () => {},
  });
}
