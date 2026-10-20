/**
 * Error de validación de `cc.json`.
 *
 * Siempre lleva la ruta exacta del documento (`$.files[0].children[2]`, etc.) para que el
 * mensaje sea accionable sin obligar a leer un stack trace.
 */
export class CcJsonError extends Error {
  readonly path: string;

  constructor(message: string, path: string) {
    super(`${message} (en ${path})`);
    this.name = "CcJsonError";
    this.path = path;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function requireRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) throw new CcJsonError("se esperaba un objeto", path);
  return value;
}

export function requireString(value: unknown, path: string, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new CcJsonError(`"${field}" debe ser una cadena no vacía`, path);
  }
  return value;
}

export function requireFiniteNumber(value: unknown, path: string, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new CcJsonError(`"${field}" debe ser un número finito`, path);
  }
  return value;
}
