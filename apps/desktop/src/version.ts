declare const __CODARCH_VERSION__: string | undefined;

/** La versión de la app de escritorio. */
export const VERSION =
  typeof __CODARCH_VERSION__ === "string" ? __CODARCH_VERSION__ : "0.0.0";
