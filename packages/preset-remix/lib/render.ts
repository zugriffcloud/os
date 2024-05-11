import { renderToReadableStream as _renderToReadableStream } from 'react-dom/server.browser';

type PostponeInfo = unknown;
type ErrorInfo = unknown;
type ReactFormState<A, B> = unknown;

type BootstrapScriptDescriptor = {
  src: string;
  integrity?: string;
  crossOrigin?: string;
};

type ImportMap = {
  imports?: {
    [specifier: string]: string;
  };
  scopes?: {
    [scope: string]: {
      [specifier: string]: string;
    };
  };
};

const renderToReadableStream: <T>(
  children: any,
  options?: {
    identifierPrefix?: string;
    namespaceURI?: string;
    nonce?: string;
    bootstrapScriptContent?: string;
    bootstrapScripts?: Array<string | BootstrapScriptDescriptor>;
    bootstrapModules?: Array<string | BootstrapScriptDescriptor>;
    progressiveChunkSize?: number;
    signal?: AbortSignal;
    onError?: (error: unknown, errorInfo: ErrorInfo) => string | void;
    onPostpone?: (reason: string, postponeInfo: PostponeInfo) => void;
    unstable_externalRuntimeSrc?: string | BootstrapScriptDescriptor;
    importMap?: ImportMap;
    formState?: ReactFormState<any, any> | null;
    onHeaders?: (headers: Headers) => void;
    maxHeadersLength?: number;
  }
) => Promise<
  ReadableStream<T> & {
    allReady: Promise<void>;
  }
> = _renderToReadableStream;

export { renderToReadableStream };
