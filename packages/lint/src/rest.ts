import type { CcRestKind } from "@codarch/schema/browser";
import type { LintFileResult, LintMessage, LintSeverity } from "./format";

/**
 * Las reglas del resto (ADR 0105).
 *
 * Enlaces rotos, documentos huérfanos, frontmatter que no cuadra y gemelas que
 * faltan. Son funciones puras sobre lo que el recorrido ya leyó —el tipo de
 * cada fichero, sus enlaces y su texto— y devuelven hallazgos con el mismo
 * vocabulario que el lint del código: regla, severidad, mensaje y línea.
 *
 * No leen disco ni el sistema de ficheros: las rutas se resuelven contra el
 * árbol que se les pasa. Así el resultado no depende de la máquina y dos
 * pasadas iguales dan lo mismo (ADR 0105, punto 7).
 *
 * En v1 no llevan línea: el snapshot del resto guarda los enlaces como aristas
 * y el tipo de cada fichero, no la posición de la ruta dentro del documento
 * (ADR 0105, punto 8).
 */

/** Los identificadores de las reglas, con el prefijo del mapa al que hablan. */
export const DOC_RULES = {
  brokenLink: "doc/broken-link",
  orphan: "doc/orphan",
  frontmatter: "doc/frontmatter",
  twinMissing: "doc/twin-missing"
} as const;

export type DocRule = (typeof DOC_RULES)[keyof typeof DOC_RULES];

/** La severidad por defecto de cada regla (ADR 0105, punto 4). */
export const DOC_RULE_SEVERITY: Record<DocRule, LintSeverity> = {
  "doc/broken-link": "error",
  "doc/orphan": "info",
  "doc/frontmatter": "error",
  "doc/twin-missing": "warn"
};

/** Un glob de documentos con las claves que su frontmatter tiene que declarar. */
export interface DocsFrontmatterRule {
  /** Patrón relativo a la raíz del repo, con `/`. */
  files: string;
  /** Las claves obligatorias, en el orden en que se declaran. */
  required: readonly string[];
}

/** Una pareja de colecciones gemelas: la misma ruta relativa en las dos. */
export interface DocsTwinPair {
  from: string;
  to: string;
}

/**
 * El bloque `docs:` de `.codarch.yml` (ADR 0105, punto 5).
 *
 * Vaciar una lista apaga su regla: sin entradas declaradas no se habla de
 * huérfanos, sin globs no se juzga ningún frontmatter y sin parejas no hay
 * gemelas que buscar. Es a propósito: un repo que no declara nada no recibe
 * avisos que no pidió.
 */
export interface DocsRulesConfig {
  /** Documentos que nunca reciben enlaces: `README.md`, el índice. */
  entries?: readonly string[];
  twins?: readonly DocsTwinPair[];
  frontmatter?: readonly DocsFrontmatterRule[];
  /** Cambia la severidad de una regla sin apagarla. */
  severity?: Partial<Record<DocRule, LintSeverity>>;
}

/**
 * Un fichero del resto tal y como lo dejó el recorrido.
 *
 * `links` son los destinos tal cual se escriben —lo que devuelve la lectura de
 * enlaces de un documento—, `frontmatter` es lo que el recorrido ya leyó al
 * medirlo y `text` permite leerlo aquí cuando no venga hecho. Sin ninguna de las
 * dos cosas no se juzga el frontmatter: no es lo mismo «no se leyó» que «no
 * tiene».
 */
export interface DocsRulesFile {
  path: string;
  kind: CcRestKind;
  links?: readonly string[];
  frontmatter?: FrontmatterHead;
  text?: string;
}

/**
 * Lo que dicen las reglas del resto.
 *
 * Devuelve un resultado por fichero, en orden de ruta, con los hallazgos ya
 * ordenados por regla. Es la forma que ya consume `createLintArtifact`, así que
 * el artefacto del resto se escribe sin traducción de por medio.
 */
export function docsFindings(input: {
  files: readonly DocsRulesFile[];
  config?: DocsRulesConfig;
}): LintFileResult[] {
  const config = input.config ?? {};
  const files = [...input.files]
    .map((file) => ({ ...file, path: normalizePath(file.path) }))
    .filter((file) => file.path !== "")
    .sort((left, right) => compareStrings(left.path, right.path));

  const known = new Set(files.map((file) => file.path));
  const found = new Map<string, LintMessage[]>();
  const add = (path: string, message: LintMessage): void => {
    const messages = found.get(path) ?? [];
    if (messages.some((entry) => sameMessage(entry, message))) return;
    messages.push(message);
    found.set(path, messages);
  };
  const severityOf = (rule: DocRule): LintSeverity =>
    config.severity?.[rule] ?? DOC_RULE_SEVERITY[rule];

  /** A quién enlazan los documentos, para saber a quién no llega nadie. */
  const incoming = new Set<string>();

  for (const file of files) {
    for (const link of file.links ?? []) {
      const resolved = resolveLink(file.path, link);
      if (resolved === null) continue;
      if (!known.has(resolved)) {
        add(file.path, {
          rule: DOC_RULES.brokenLink,
          severity: severityOf(DOC_RULES.brokenLink),
          message: `el enlace «${link.trim()}» no llega a ningún fichero del árbol`
        });
        continue;
      }
      // Un enlace a sí mismo es un ancla mal escrita, no un documento que se
      // alcanza: cuenta igual que no tener entradas.
      if (resolved !== file.path) incoming.add(resolved);
    }
  }

  const entries = (config.entries ?? [])
    .map((entry) => normalizePath(entry))
    .filter((entry) => entry !== "");
  if (entries.length > 0) {
    for (const file of files) {
      if (file.kind !== "doc" || incoming.has(file.path)) continue;
      if (entries.some((entry) => matchesGlob(entry, file.path))) continue;
      add(file.path, {
        rule: DOC_RULES.orphan,
        severity: severityOf(DOC_RULES.orphan),
        message: "ningún documento enlaza a este"
      });
    }
  }

  for (const rule of config.frontmatter ?? []) {
    const pattern = normalizePath(rule.files);
    if (pattern === "") continue;
    for (const file of files) {
      if (!matchesGlob(pattern, file.path)) continue;
      const head =
        file.frontmatter ??
        (file.text === undefined ? null : readFrontmatter(file.text));
      if (head === null) continue;
      if (head.status === "missing") {
        add(file.path, {
          rule: DOC_RULES.frontmatter,
          severity: severityOf(DOC_RULES.frontmatter),
          message: "no tiene frontmatter"
        });
        continue;
      }
      if (head.status === "broken") {
        add(file.path, {
          rule: DOC_RULES.frontmatter,
          severity: severityOf(DOC_RULES.frontmatter),
          message: "el frontmatter no se puede leer"
        });
        continue;
      }
      for (const key of rule.required) {
        if (head.keys.includes(key)) continue;
        add(file.path, {
          rule: DOC_RULES.frontmatter,
          severity: severityOf(DOC_RULES.frontmatter),
          message: `el frontmatter no declara «${key}»`
        });
      }
    }
  }

  for (const pair of config.twins ?? []) {
    const from = normalizePath(pair.from);
    const to = normalizePath(pair.to);
    if (from === "" || to === "" || from === to) continue;

    for (const file of files) {
      if (file.kind !== "doc") continue;

      // Dentro de una colección anidada (`docs` y `docs/en`), lo que ya vive en
      // el otro lado no pide gemela: la tiene por construcción.
      const inFrom = under(from, file.path);
      if (inFrom !== null && under(to, file.path) === null) {
        const expected = join(to === "" ? inFrom : `${to}/${inFrom}`);
        if (!known.has(expected)) {
          add(file.path, {
            rule: DOC_RULES.twinMissing,
            severity: severityOf(DOC_RULES.twinMissing),
            message: `no tiene gemela en «${expected}»`
          });
        }
      }

      // En la dirección de vuelta no hace falta mirar `from`: si la colección
      // está anidada, todo lo que vive en `to` cuelga también de `from` y esa
      // es justo la ruta que hay que buscar.
      const inTo = under(to, file.path);
      if (inTo !== null) {
        const expected = join(from === "" ? inTo : `${from}/${inTo}`);
        if (!known.has(expected)) {
          add(file.path, {
            rule: DOC_RULES.twinMissing,
            severity: severityOf(DOC_RULES.twinMissing),
            message: `no tiene gemela en «${expected}»`
          });
        }
      }
    }
  }

  return files.map((file) => ({
    path: file.path,
    messages: [...(found.get(file.path) ?? [])].sort(compareMessages)
  }));
}

/** Lo que se pudo leer del frontmatter de un documento. */
export interface FrontmatterHead {
  /**
   * `ok` si hay bloque, `missing` si el documento no empieza por `---` y
   * `broken` si el bloque no se cierra.
   */
  status: "ok" | "missing" | "broken";
  /** Las claves de primer nivel, tal y como aparecen y en su orden. */
  keys: string[];
}

/**
 * Lee las claves de primer nivel del frontmatter.
 *
 * No es un parser de YAML: solo hace falta saber qué claves se declaran, y el
 * frontmatter de una colección es plano. Las claves anidadas (bajo `sidebar:`,
 * por ejemplo) van sangradas y por eso no cuentan; una línea sin `:` a nivel
 * cero es un valor suelto y tampoco. Un bloque sin cerrar es un error, no un
 * documento sin frontmatter: son cosas distintas y se arreglan distinto.
 */
export function readFrontmatter(source: string): FrontmatterHead {
  const text = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const lines = text.split("\n");
  if ((lines[0] ?? "").trim() !== "---") return { status: "missing", keys: [] };

  const end = lines.findIndex(
    (line, index) => index > 0 && line.trim() === "---"
  );
  if (end === -1) return { status: "broken", keys: [] };

  const keys: string[] = [];
  for (const line of lines.slice(1, end)) {
    const match = /^([A-Za-z0-9_][A-Za-z0-9_.-]*)\s*:/.exec(line);
    const key = match?.[1];
    if (key && !keys.includes(key)) keys.push(key);
  }
  return { status: "ok", keys };
}

/**
 * Si una ruta cae dentro de una colección y con qué resto.
 *
 * `null` si no está debajo. La raíz (`""`) contiene todo; se compara con `/`
 * delante para que `docs` no se coma `docs-otros`.
 */
function under(collection: string, path: string): string | null {
  if (collection === "") return path;
  if (!path.startsWith(`${collection}/`)) return null;
  const rest = path.slice(collection.length + 1);
  return rest === "" ? null : rest;
}

/** El destino de un enlace como ruta del árbol, o `null` si no lo es. */
export function resolveLink(fromPath: string, target: string): string | null {
  const raw = target.trim();
  // Esquemas (`https:`, `mailto:`), `//host` y rutas del sitio (`/docs/x`): no
  // son ficheros del repo y no se pueden comprobar contra el árbol.
  if (raw === "" || /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/)/i.test(raw)) return null;

  const hash = raw.indexOf("#");
  const withoutAnchor = hash === -1 ? raw : raw.slice(0, hash);
  const question = withoutAnchor.indexOf("?");
  const clean = (
    question === -1 ? withoutAnchor : withoutAnchor.slice(0, question)
  ).trim();
  // `#seccion` sola: no lleva ruta que comprobar.
  if (clean === "") return null;

  const slash = fromPath.lastIndexOf("/");
  const parts = slash === -1 ? [] : fromPath.slice(0, slash).split("/");
  for (const segment of clean.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      if (parts.length === 0) return null;
      parts.pop();
      continue;
    }
    parts.push(segment);
  }
  return join(parts.join("/"));
}

/**
 * Si una ruta casa con un glob de documentos.
 *
 * Admite `*` (sin cruzar `/`), `**` (cruzando carpetas, incluida ninguna) y
 * `?`. Es lo que necesitan las entradas y los globs de frontmatter, y no una
 * dependencia más: la misma ruta tiene que casar igual en el CLI y en la app.
 */
export function matchesGlob(pattern: string, path: string): boolean {
  const source = globToRegExp(normalizePath(pattern));
  return source !== null && source.test(normalizePath(path));
}

function globToRegExp(pattern: string): RegExp | null {
  if (pattern === "") return null;
  let source = "^";
  for (let index = 0; index < pattern.length; index++) {
    const char = pattern[index] ?? "";
    if (char === "*") {
      if (pattern[index + 1] === "*") {
        index += 1;
        if (pattern[index + 1] === "/") {
          index += 1;
          source += "(?:.*/)?";
        } else {
          source += ".*";
        }
      } else {
        source += "[^/]*";
      }
      continue;
    }
    if (char === "?") {
      source += "[^/]";
      continue;
    }
    source += char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`${source}$`);
}

/** Una ruta relativa con `/`, sin `./` ni barras repetidas. */
function normalizePath(input: string): string {
  const posix = input.trim().replace(/\\/g, "/").replace(/\/{2,}/g, "/");
  const withoutDot = posix.startsWith("./") ? posix.slice(2) : posix;
  return join(withoutDot);
}

/** Una ruta ya en forma: sin barras al principio ni al final. */
function join(path: string): string {
  return path.replace(/^\/+/, "").replace(/\/+$/, "");
}

function sameMessage(left: LintMessage, right: LintMessage): boolean {
  return (
    left.rule === right.rule &&
    left.severity === right.severity &&
    left.line === right.line &&
    left.message === right.message
  );
}

function compareMessages(left: LintMessage, right: LintMessage): number {
  return (
    compareStrings(left.rule, right.rule) ||
    (left.line ?? 0) - (right.line ?? 0) ||
    compareStrings(left.message, right.message)
  );
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
