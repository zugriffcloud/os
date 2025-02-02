---
title: Runtime APIs
---

To provide you with the best experience possible, we strive to adhere to the [WinterCG](https://wintercg.org) requirements.

:::caution
While we do not support all NodeJS APIs, many npm packages should run on zugriff.
:::

:::tip[Did you know?]
You do not have to miss out on databases and sending emails. Check out our [ecosystem](/ecosystem/addons/postgres).
:::

## Request Handler

To serve a dynamic request, you either need to export a function of your choice or listen to `fetch` events.

```ts {15}
export function handler(event: Request) {
  return new Response('Hallo Welt!');
}
```

```ts
addEventListener('fetch', (event) => {
  event.respondWith(new Response('Hello World!'));
});
```

## Global Objects

Next to the [standard built-in objects](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects), we implement the following APIs.

### [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)

### [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal)

### [`AsyncLocalStorage`](https://nodejs.org/api/async_context.html#class-asynclocalstorage)

### [`atob`](https://developer.mozilla.org/en-US/docs/Web/API/atob)

### [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob)

### [`btoa`](https://developer.mozilla.org/en-US/docs/Web/API/btoa)

### [`Buffer`](https://nodejs.org/api/buffer.html)

### [`ByteLengthQueuingStrategy`](https://developer.mozilla.org/en-US/docs/Web/API/ByteLengthQueuingStrategy)

### [`clearInterval`](https://developer.mozilla.org/en-US/docs/Web/API/clearInterval)

### [`clearTimeout`](https://developer.mozilla.org/en-US/docs/Web/API/clearTimeout)

### [`CompressionStream`](https://developer.mozilla.org/en-US/docs/Web/API/CompressionStream)

### [`console`](https://developer.mozilla.org/en-US/docs/Web/API/console)

:::caution
Only a subset of the console methods is available.
Furthermore, string substitutions are ignored.
:::

- `console.log`
- `console.trace`
- `console.info`
- `console.debug`
- `console.error`
- `console.warn`

### [`CountQueuingStrategy`](https://developer.mozilla.org/en-US/docs/Web/API/CountQueuingStrategy)

### [`crypto.getRandomValues`](https://developer.mozilla.org/en-US/docs/Web/API/CountQueuingStrategy)

### [`crypto.randomUUID`](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID)

### [`crypto.subtle`](https://nodejs.org/api/webcrypto.html)

Please see the [SubtleCrypto](#subtlecrypto) interface.

### [`CryptoKey`](https://developer.mozilla.org/en-US/docs/Web/API/CryptoKey)

### [`CryptoKeyPair`](https://developer.mozilla.org/en-US/docs/Web/API/CryptoKeyPair)

### [`CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent)

### [`Date`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date) (built-in)

:::note
To mitigate side-channel timing attacks such as Spectre, `new Date()` is context bound and will resolve to the timestamp a request
was received.
Use the [`performance`](#performance) API to get an **approximation** of how much time passed since zugriff received a request.
:::

### [`DecompressionStream`](https://developer.mozilla.org/en-US/docs/Web/API/DecompressionStream)

### [`DOMException`](https://developer.mozilla.org/en-US/docs/Web/API/DOMException)

### `EdgeRuntime`

Similar to Vercel, we expose the `EdgeRuntime` property. You can use it to check if your code is running on an Edge runtime.

### [`Event`](https://developer.mozilla.org/en-US/docs/Web/API/Event/Event)

### [`EventTarget`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget)

### [`fetch`](https://developer.mozilla.org/en-US/docs/Web/API/fetch)

### [`File`](https://developer.mozilla.org/en-US/docs/Web/API/File)

### [`FileReader`](https://developer.mozilla.org/en-US/docs/Web/API/FileReader)

### [`FormData`](https://developer.mozilla.org/en-US/docs/Web/API/FormData)

### [`Headers`](https://developer.mozilla.org/en-US/docs/Web/API/Headers)

### [`navigator`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator)

:::caution
We only expose the `userAgent` property of the navigator interface.
:::

### [`performance`](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API)

:::note
To mitigate side-channel timing attacks such as Spectre, calling `performance.now()` will not be accurate and only
provide an approximation.
:::

### [`queueMicrotask`](https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide)

### [`ReadableByteStreamController`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableByteStreamController)

### [`ReadableStream`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream)

### [`ReadableStreamBYOBReader`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStreamBYOBReader)

### [`ReadableStreamBYOBRequest`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStreamBYOBRequest)

### [`ReadableStreamDefaultController`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStreamDefaultController)

### [`ReadableStreamDefaultReader`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStreamDefaultReader)

### [`Request`](https://developer.mozilla.org/en-US/docs/Web/API/Request)

### [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response)

### [`setInterval`](https://developer.mozilla.org/en-US/docs/Web/API/setInterval)

### [`setTimeout`](https://developer.mozilla.org/en-US/docs/Web/API/setTimeout)

### [`structuredClone`](https://developer.mozilla.org/en-US/docs/Web/API/structuredClone)

### [`SubtleCrypto`](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto)

:::note
Access the SubtleCrypto interface through the [`crypto.subtle`](#cryptosubtle) interface.
:::

|                   | sign | verify | encrypt | decrypt | digest | deriveBits | deriveKey | wrapKey | unwrapKey |
| :---------------- | :--: | :----: | :-----: | :-----: | :----: | :--------: | :-------: | :-----: | :-------: |
| RSASSA-PKCS1-v1_5 |  ✓   |   ✓    |         |         |        |            |           |         |           |
| RSA-PSS           |  ✓   |   ✓    |         |         |        |            |           |         |           |
| ECDSA             |  ✓   |   ✓    |         |         |        |            |           |         |           |
| HMAC              |  ✓   |   ✓    |         |         |        |            |           |         |           |
| RSA-OAEP          |      |        |    ✓    |    ✓    |        |            |           |    ✓    |     ✓     |
| AES-CTR           |      |        |    ✓    |    ✓    |        |            |           |    ✓    |     ✓     |
| AES-CBC           |      |        |    ✓    |    ✓    |        |            |           |    ✓    |     ✓     |
| AES-GCM           |      |        |    ✓    |    ✓    |        |            |           |    ✓    |     ✓     |
| SHA-1             |      |        |         |         |   ✓    |            |           |         |           |
| SHA-256           |      |        |         |         |   ✓    |            |           |         |           |
| SHA-384           |      |        |         |         |   ✓    |            |           |         |           |
| SHA-512           |      |        |         |         |   ✓    |            |           |         |           |
| ECDH              |      |        |         |         |        |     ✓      |     ✓     |         |           |
| HKDF              |      |        |         |         |        |     ✓      |     ✓     |         |           |
| PBKDF2            |      |        |         |         |        |     ✓      |     ✓     |         |           |
| AES-KW            |      |        |         |         |        |            |           |    ✓    |     ✓     |

### [`TextDecoder`](https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder)

### [`TextDecoderStream`](https://developer.mozilla.org/en-US/docs/Web/API/TextDecoderStream)

### [`TextEncoder`](https://developer.mozilla.org/en-US/docs/Web/API/TextEncoder)

### [`TextEncoderStream`](https://developer.mozilla.org/en-US/docs/Web/API/TextEncoderStream)

### [`TransformStream`](https://developer.mozilla.org/en-US/docs/Web/API/TransformStream)

### [`TransformStreamDefaultController`](https://developer.mozilla.org/en-US/docs/Web/API/TransformStreamDefaultController)

### [`URL`](https://developer.mozilla.org/en-US/docs/Web/API/URL)

### [`URLPattern`](https://developer.mozilla.org/en-US/docs/Web/API/URLPattern)

### [`URLSearchParams`](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams)

### [`WritableStream`](https://developer.mozilla.org/en-US/docs/Web/API/WritableStream)

### [`WritableStreamDefaultController`](https://developer.mozilla.org/en-US/docs/Web/API/WritableStreamDefaultController)

### [`WritableStreamDefaultWriter`](https://developer.mozilla.org/en-US/docs/Web/API/WritableStreamDefaultWriter)

## Node.js compatibility

Available Node.js modules can be imported using the ESM-import syntax.

### [`Assert`](https://nodejs.org/docs/v20.12.1/api/assert.html)

### [`Async Hooks`](https://nodejs.org/docs/v20.12.1/api/async_hooks.html)

:::caution
Only the `AsyncLocalStorage` class is exported.
:::

### [`Buffer`](https://nodejs.org/docs/v20.12.1/api/buffer.html)

:::caution
Only the `Buffer` class and the `atob`, `btoa`, `isAscii` and `isUtf8` methods are exported.
:::

### [`Events`](https://nodejs.org/docs/v20.12.1/api/events.html)

:::caution
Only the `EventEmitter` class and the `captureRejectionSymbol` symbol are exported.
:::

### [`Path`](https://nodejs.org/docs/v20.12.1/api/path.html)

### [`Process`](https://nodejs.org/docs/v20.12.1/api/process.html)

:::caution
Only the `env` object and `nextTick` function are exported.
:::

### [`Util`](https://nodejs.org/docs/v20.12.1/api/util.html)

:::caution
Only a subset including the deprecated functions, `types`, `TextEncoder` class, `TextDecoder` class, `promisify` function, `callbackify` function, `isDeepStrictEqual` function, `MIMEParams` class and `MIMEType` class are exported.
:::
