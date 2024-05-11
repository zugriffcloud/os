import {
  hash as argon2id_hash,
  verify as argon2id_verify,
} from '$lib/argon2id';
import { hash as scrypt_hash, verify as scrypt_verify } from '$lib/scrypt';

export const argon2id = {
  hash: argon2id_hash,
  verify: argon2id_verify,
};

export const scrypt = {
  hash: scrypt_hash,
  verify: scrypt_verify,
};
