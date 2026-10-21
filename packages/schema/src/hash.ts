import { md5 } from "@noble/hashes/legacy.js";
import { sha256 } from "@noble/hashes/sha2.js";

/**
 * Hash del modelo.
 *
 * Se usa una implementación en JavaScript puro, y no `node:crypto`, para que
 * el navegador calcule los mismos ids y el mismo checksum que el CLI. Web
 * Crypto solo tiene SHA y es asíncrono, así que no sirve.
 *
 * `@noble/hashes` está auditado y da exactamente los mismos digests que
 * `node:crypto`; el test de paridad del navegador lo fija.
 */

const encoder = new TextEncoder();

/** SHA-256 de un texto, en hexadecimal. */
export function sha256Hex(input: string): string {
  return toHex(sha256(encoder.encode(input)));
}

/** MD5 de un texto, en hexadecimal. */
export function md5Hex(input: string): string {
  return toHex(md5(encoder.encode(input)));
}

function toHex(bytes: Uint8Array): string {
  let hex = "";
  for (const byte of bytes) hex += byte.toString(16).padStart(2, "0");
  return hex;
}
