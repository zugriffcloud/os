type ZError = {
  type: string;
  message: string;
};

declare function __zugriff_preprocess_async_result<T>(
  value: T
): Exclude<T, ZError>;

declare function __zugriff_crypto_argon2id_hash(
  password: string
): ZError | { index: number; promise: Promise<string> };

declare function __zugriff_crypto_argon2id_verify(
  password: string,
  hash: string
): ZError | { index: number; promise: Promise<boolean> };

declare function __zugriff_crypto_scrypt_hash(
  password: string
): ZError | { index: number; promise: Promise<string> };

declare function __zugriff_crypto_scrypt_verify(
  password: string,
  hash: string
): ZError | { index: number; promise: Promise<boolean> };
