---
title: Runtime APIs
---

To provide you with the best experience possible, we strive to adhere to the [WinterTC](https://wintertc.org) requirements.

:::caution
While we do not support all NodeJS APIs, many npm packages should run on zugriff.
:::

:::tip
You do not have to miss out on databases and sending emails. Explore out CloudFlare-compatible
[TCP sockets](#sockets-tcp), our [ecosystem of proxies](/ecosystem/addons/postgres) and our Node.js
compatible [`net`](#net) and [`tls`](#tls) modules.
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

Next to the [standard built-in objects](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects), we implement the following Browser and [Node.js](#nodejs-compatibility) APIs.

#### [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)

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

### `Sockets (TCP)`

:::caution
Importing 'cloudflare:sockets' or 'zugriff:sockets' when running the `preview` command will fail.
Please use `node:net` or `node:tls` instead.
\
Connections to the [same network](/concepts/dns), as well as to port `25` are rejected.
:::

```js
import { connect } from 'zugriff:sockets';

// Find more examples at https://github.com/zugriffcloud/examples/tree/main/apps

/**
 * @param {Request} request
 */
export async function handler(request) {
  const gopherAddr = { hostname: 'gopher.floodgap.com', port: 70 };
  const url = new URL(request.url);

  try {
    const socket = connect(gopherAddr);

    const writer = socket.writable.getWriter();
    const encoder = new TextEncoder();
    const encoded = encoder.encode(url.pathname + '\r\n');
    await writer.write(encoded);
    await writer.close();

    return new Response(socket.readable, {
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (error) {
    return new Response('Socket connection failed: ' + error, { status: 500 });
  }
}
```

Create a socket calling `connect`.

- `connect(address: SocketAddress | string, options?: optional SocketOptions): Socket`
- `SocketAddress`
  - `hostname: string`
  - `port: number`
- `SocketOptions`
  - `secureTransport: off | on | starttls` (Defaults to `off`)
  - `allowHalfOpen: boolean` (The writable half will not automatically close) (Defaults to `false`)
  - `insecureEncryption: boolean` (Defaults to `false`)
    - This option is unique to `zugriff` and **not** supported by Cloudflare. We are looking into providing an option to validate self-signed certificates. (Yet, any encryption is better than no encryption.)

When connecting, a `Socket` is returned.

- `Socket`
  - `readable: ReadableStream` (Returns `ArrayBuffer`)
  - `writable: WritableStream` (Processes chunks of `Uint8Array` or its views)
  - `opened: Promise<SocketInfo>` (Resolves after a connection is established)
  - `closed: Promise<void>` (Resolves after a connection is closed or an error occurred)
  - `close(): Promise<void>`
  - `startTls(): Socket` (After closing both the readable and writable streams, the connection is upgraded when `secureTransport` is set to `starttls`)
    \
    &nbsp;
- `SocketInfo`
  - `remoteAddress: string | null` (`zugriff` does not yet return a value other than `null`)
  - `localAddress: string | null` (`zugriff` does not yet return a value other than `null`)

Find information on `cloudflare:sockets` at https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/.

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
Only the `AsyncLocalStorage` class is exposed.
:::

### [`Buffer`](https://nodejs.org/docs/v20.12.1/api/buffer.html)

:::caution
Only the `Buffer`, `File`, `Blob` classes and the `atob`, `btoa`, `isAscii` and `isUtf8` functions are exposed.
:::

### [`Crypto`](https://nodejs.org/docs/v20.12.1/api/crypto.html)

:::caution
Only the `subtle` `webcrypto` objects and the `getRandomValues`, `randomBytes`, `randomFill`, `randomFillSync`, `randomInt`, `randomUUID` functions are exposed.
:::

### [`Diagnostics Channel`](https://nodejs.org/docs/v20.12.1/api/diagnostics_channel.html)

### [`DNS`](https://nodejs.org/docs/v20.12.1/api/dns.html)

:::caution
This module defaults Quad9 (`9.9.9.9`). `1.1.1.1` and `8.8.8.8` may be set as resolvers. The DoH protocol is used.
:::

### [`Events`](https://nodejs.org/docs/v20.12.1/api/events.html)

:::caution
`NodeEventTarget` is not exposed.
:::

### [`Net`](https://nodejs.org/docs/v20.12.1/api/net.html)

### [`Os`](https://nodejs.org/docs/v20.12.1/api/os.html)

:::caution
Only the `EOL` constant and the `devNull`, `availableParallelism`, `machine`, `getPriority`, `version`, `userInfo`, `setPriority`, `endianness`, `hostname`, `loadavg`, `uptime`, `freemem`, `totalmem`, `cpus`, `type`, `release`, `networkInterfaces`, `arch`, `platform`, `tmpdir` functions are exposed.
:::

### [`Path`](https://nodejs.org/docs/v20.12.1/api/path.html)

### [`Performance Hooks`](https://nodejs.org/docs/v20.12.1/api/perf_hooks.html)

:::caution
Only the `performance` object is exposed.
:::

### [`Process`](https://nodejs.org/docs/v20.12.1/api/process.html)

:::caution
Only the `env` object, the `platform` (`browser`), `arch` (`javascript`) constants and the `nextTick`, `cwd` functions and methods of EventEmitter are exposed.
:::

### [`Stream`](https://nodejs.org/docs/v20.12.1/api/stream.html)

### [`String Decoder`](https://nodejs.org/docs/v20.12.1/api/string_decoder.html)

### [`Tls`](https://nodejs.org/docs/v20.12.1/api/tls.html)

:::caution
Only `TlsSocket`, `connect` and `createSecureContext` are exposed.
:::

### [`Url`](https://nodejs.org/docs/v20.12.1/api/url.html)

:::caution
Only the `URL`, `URLPattern`, `URLSearchParams` classes and the `domainToASCII`, `domainToUnicode` functions are exposed.
:::

### [`Util`](https://nodejs.org/docs/v20.12.1/api/util.html)

:::caution
Only the deprecated functions, `types`, the `TextEncoder`, `TextDecoder`, `MIMEParams`, `MIMEType` classes, the `promisify`, `callbackify`, `isDeepStrictEqual` functions are exposed.
:::

### [`Zlib`](https://nodejs.org/docs/v20.12.1/api/zlib.html)

:::caution
The Brotli algorithm is not supported.
:::
