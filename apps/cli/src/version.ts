declare const __CODARCH_VERSION__: string | undefined;

/**
 * La versión que se está ejecutando.
 *
 * La define el empaquetado (`__CODARCH_VERSION__` ✓); en desarrollo, sin
 * empaquetar, se dice la de desarrollo ✓.
 */
export const VERSION =
  typeof __CODARCH_VERSION__ === "string" ? __CODARCH_VERSION__ : "0.0.0";
