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

/**
 * Serialización canónica: claves ordenadas, sin `undefined` y con los números
 * no finitos como `null`.
 *
 * Es la forma en la que se calcula un checksum: dos objetos iguales tienen que
 * dar el mismo texto aunque sus claves se hayan creado en otro orden. Vive aquí
 * para que el snapshot y el lint no tengan dos serializadores que se separen.
 */
export function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number") {
    return Number.isFinite(value) ? JSON.stringify(value) : "null";
  }
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`;
  }
  return "null";
}
