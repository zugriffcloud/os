import '$lib/zugriff.d.ts';

let hash_wasm: typeof import('hash-wasm');

export async function hash(password: string): Promise<string> {
  if (
    typeof __zugriff_crypto_scrypt_hash == 'function' &&
    typeof __zugriff_preprocess_async_result == 'function'
  ) {
    const { promise } = await __zugriff_preprocess_async_result(
      __zugriff_crypto_scrypt_hash(password)
    );
    return await promise;
  }

  let salt = new Uint8Array(16);
  if (typeof window != 'undefined') {
    salt = window.crypto.getRandomValues(salt);
  } else {
    salt = crypto.getRandomValues(salt);
  }

  if (!hash_wasm) hash_wasm = await import('hash-wasm');
  const { scrypt } = hash_wasm;

  const costFactor = 131072;
  const blockSize = 8;
  const parallelism = 1;

  return (
    '$scrypt$ln=' +
    Math.log(costFactor) / Math.log(2) +
    ',r=' +
    blockSize +
    ',p=' +
    parallelism +
    '$' +
    Buffer.from(salt).toString('base64').replace(/=+$/, '') +
    '$' +
    Buffer.from(
      await scrypt({
        password,
        salt,
        costFactor,
        blockSize,
        parallelism,
        hashLength: 32,
        outputType: 'binary',
      })
    )
      .toString('base64')
      .replace(/=+$/, '')
  );
}

export async function verify(password: string, hash: string): Promise<boolean> {
  if (
    typeof __zugriff_crypto_scrypt_verify == 'function' &&
    typeof __zugriff_preprocess_async_result == 'function'
  ) {
    const { promise } = await __zugriff_preprocess_async_result(
      __zugriff_crypto_scrypt_verify(password, hash)
    );
    return await promise;
  }

  if (!hash_wasm) hash_wasm = await import('hash-wasm');
  const { scrypt } = hash_wasm;

  const parts = hash.split('$');

  const hashHash = Buffer.from(pad(parts.pop()), 'base64');
  const salt = Buffer.from(pad(parts.pop()), 'base64');

  const options = Object.fromEntries(
    parts
      .pop()
      .split(',')
      .map((option) => option.split('='))
  );

  const costFactor = options.ln
    ? Math.round(Math.pow(Math.E, options.ln * Math.log(2)))
    : 131072;
  const blockSize = options.r ? Number(options.r) : 8;
  const parallelism = options.p ? Number(options.p) : 1;

  const passwordHash = await scrypt({
    password,
    salt,
    costFactor,
    blockSize,
    parallelism,
    hashLength: hashHash.length,
    outputType: 'binary',
  });

  return passwordHash.every((value, index) => hashHash[index] == value);
}

function pad(value: string): string {
  const padding = 4 - (value.length % 4);
  if (padding !== 4) {
    return value + '='.repeat(padding);
  }
  return value;
}
