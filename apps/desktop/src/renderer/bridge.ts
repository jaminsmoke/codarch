import type { CodarchDesktop } from "../preload";

/** El puente con el proceso principal, expuesto por el preload ✓. */
export function desktop(): CodarchDesktop {
  const api = (window as unknown as { codarch?: CodarchDesktop }).codarch;
  if (!api) {
    throw new Error("El puente del escritorio no está disponible.");
  }
  return api;
}
