/**
 * Las piezas comunes de los argumentos.
 *
 * Todos los comandos leen lo mismo: opciones con valor en sus dos formas
 * (`--out ruta` y `--out=ruta`), interruptores, la ayuda, la versión y rutas
 * sueltas. Lo que se repite vive aquí; cada comando declara solo sus opciones
 * en `args/`, para que su parser quepa de un vistazo.
 */

/** El error, ya escrito, y el código de salida que le toca. */
export function fail(message: string): 1 {
  console.error(message);
  return 1;
}

/** Si el argumento pide la ayuda. */
export function isHelp(arg: string): boolean {
  return arg === "--help" || arg === "-h";
}

/** Si el argumento pide la versión. */
export function isVersion(arg: string): boolean {
  return arg === "--version" || arg === "-v";
}

/**
 * Un entero dentro de un rango, o `null` si el texto no lo es.
 *
 * Un valor vacío no es cero: `--top=` es un error, no el mínimo.
 */
export function integerInRange(
  value: string | undefined,
  min: number,
  max = Number.MAX_SAFE_INTEGER
): number | null {
  const parsed = Number(value);
  if (!value || !Number.isInteger(parsed) || parsed < min || parsed > max) {
    return null;
  }
  return parsed;
}

/**
 * Una opción que lleva un valor.
 *
 * El primer nombre es el que se nombra en los mensajes de error. `set` puede
 * devolver un mensaje: entonces el valor no vale y el parseo se corta.
 */
export interface ValueFlag<T> {
  names: readonly string[];
  /** Lo que espera, en palabras: «una ruta». */
  hint: string;
  /**
   * Si acepta la forma con `=` (`--out=ruta`). Por defecto sí; `addons` y
   * `plugins` solo entienden la forma separada, como hasta ahora.
   */
  inline?: boolean;
  set: (options: T, value: string) => string | void;
}

export type FlagRead = { next: number } | { error: string } | null;

/** Una opción que no lleva valor: `--json`, `--no-config`, `--rebuild`. */
export interface SwitchFlag<T> {
  names: readonly string[];
  set: (options: T) => void;
}

/**
 * Aplica el interruptor que case con el argumento.
 *
 * `true` si era uno de los declarados; los comandos con un solo interruptor no
 * necesitan tabla y lo comprueban con un `if`, pero con varios la tabla deja
 * el bucle en una línea.
 */
export function readSwitch<T>(
  arg: string,
  options: T,
  switches: readonly SwitchFlag<T>[]
): boolean {
  for (const item of switches) {
    if (!item.names.includes(arg)) continue;
    item.set(options);
    return true;
  }
  return false;
}

/**
 * Lee la opción con valor que empiece en `args[index]`.
 *
 * Devuelve `null` si el argumento no es ninguna de las declaradas, el error si
 * es una pero viene sin valor, y el índice por el que seguir cuando la aplicó.
 * La forma con `=` solo vale para el nombre largo: `-o=ruta` es una opción
 * desconocida, como siempre.
 */
/** El valor de una opción, y cuántos argumentos quedan consumidos tras ella. */
interface MatchedValue {
  value: string;
  consumed: number;
}

/**
 * El valor que trae la opción en este argumento.
 *
 * `null` si el argumento no es la opción, `"missing"` si lo es y viene sin
 * valor, y el valor cuando lo trae. La forma separada (`--out ruta`) gasta el
 * argumento siguiente; la forma con `=` no gasta ninguno y admite el vacío.
 */
function matchValue<T>(
  flag: ValueFlag<T>,
  args: readonly string[],
  index: number
): MatchedValue | "missing" | null {
  const arg = args[index] ?? "";
  const long = flag.names.find((name) => name.startsWith("--")) ?? flag.names[0] ?? arg;
  const inlinePrefix = `${long}=`;
  const inline =
    flag.inline !== false && arg.startsWith(inlinePrefix)
      ? arg.slice(inlinePrefix.length)
      : undefined;

  if (inline !== undefined) return { value: inline, consumed: 0 };
  if (!flag.names.includes(arg)) return null;

  const value = args[index + 1];
  if (!value) return "missing";
  return { value, consumed: 1 };
}

export function readValueFlag<T>(
  args: readonly string[],
  index: number,
  options: T,
  flags: readonly ValueFlag<T>[]
): FlagRead {
  for (const flag of flags) {
    const matched = matchValue(flag, args, index);
    if (matched === null) continue;
    if (matched === "missing") {
      const name = flag.names.find((value) => value.startsWith("--")) ?? flag.names[0] ?? "";
      return { error: `${name} necesita ${flag.hint}` };
    }

    const error = flag.set(options, matched.value);
    if (typeof error === "string") return { error };
    return { next: index + matched.consumed };
  }

  return null;
}
