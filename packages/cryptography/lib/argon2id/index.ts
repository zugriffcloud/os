import '$lib/zugriff.d.ts';

let hash_wasm: typeof import('hash-wasm');

export async function hash(password: string): Promise<string> {
  if (
    typeof __zugriff_crypto_argon2id_hash == 'function' &&
    typeof __zugriff_preprocess_async_result == 'function'
  ) {
    const { promise } = await __zugriff_preprocess_async_result(
      __zugriff_crypto_argon2id_hash(password)
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
  const { argon2id } = hash_wasm;

  return await argon2id({
    password,
    salt,
    parallelism: 1,
    iterations: 2,
    memorySize: 19456,
    hashLength: 32,
    outputType: 'encoded',
  });
}

export async function verify(password: string, hash: string): Promise<boolean> {
  if (
    typeof __zugriff_crypto_argon2id_verify == 'function' &&
    typeof __zugriff_preprocess_async_result == 'function'
  ) {
    const { promise } = await __zugriff_preprocess_async_result(
      __zugriff_crypto_argon2id_verify(password, hash)
    );
    return await promise;
  }

  if (!hash_wasm) hash_wasm = await import('hash-wasm');
  const { argon2Verify } = hash_wasm;

  return await argon2Verify({
    password,
    hash,
  });
}
