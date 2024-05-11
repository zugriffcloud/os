declare function addEventListener(
  type: String,
  callback: (
    event: Request & {
      respondWith(
        response: Promise<Response>
      ): void;
    }
  ) => void
): void;
