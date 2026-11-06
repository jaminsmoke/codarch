import { formatBytes } from "./io";

/**
 * El resumen que `codarch analyze` escribe al terminar.
 *
 * Es presentación y solo presentación: entra lo que se midió y sale el texto.
 * Antes vivía dentro del comando y, al construir cada línea, escribía la caché
 * de parseo, el registro de alcances y la foto del historial —un formateador
 * con efectos—; ahora esas escrituras las hace quien manda y aquí llegan hechas
 * (ADR 0099, ADR 0089). Así esta pieza se prueba sola, sin `git` y sin `fs`.
 */

const numberFormat = new Intl.NumberFormat("es-ES");

function num(value: number): string {
  return numberFormat.format(value);
}

function field(label: string, value: string): string {
  return `  ${label.padEnd(12)} ${value}`;
}

/** «1 error», «3 errores»: la cuenta con su palabra. */
function tally(value: number, one: string, many: string): string {
  return `${num(value)} ${value === 1 ? one : many}`;
}

/** Qué pasó con el lint en esta pasada. */
export type LintLine =
  | { kind: "skipped" }
  | { kind: "none" }
  | { kind: "failed"; error: string }
  | {
      kind: "measured";
      path: string;
      bytes: number;
      totals: {
        errors: number;
        warnings: number;
        info: number;
        files: number;
      } | null;
      /**
       * Ficheros que la cobertura deriva. Ausente si el número no se sabe:
       * no es un cero.
       */
      measured?: number;
      /** Frase del contrato (`universo no verificado`, `cobertura parcial`…). */
      note?: string;
    };

/** Lo que el resumen cuenta, ya medido y sin nada que hacer. */
export interface ReportFacts {
  rootPath: string;
  snapshot: { path: string; bytes: number };
  /** El mapa de lo que no es código, si esta pasada lo escribió (ADR 0093). */
  rest: { path: string; bytes: number; files: number; links: number } | null;
  lint: LintLine;
  structure: { files: number; folders: number; edges: number; cycles: number };
  imports: {
    external: number;
    builtin: number;
    typeOnly: number;
    unresolved: number;
  };
  migration: {
    languages: [string, number][];
    bridges: number;
    ffi: number;
    debt: number;
  };
  /** La caché de parseo: lo que se guardó, o por qué no se pudo. */
  parse: { hits: number; misses: number; fromScopes: number } | { error: string };
  /** Los alcances de debajo (ADR 0089): cuántos hay, o por qué no se sabe. */
  scopes: { nested: number; stale: number } | { error: string };
  durationMs: number;
  /** La foto del historial, si se pidió guardarla. */
  history: { saved: string } | { unchanged: true } | { error: string } | null;
  churn: {
    enabled: boolean;
    commits: number;
    authors: number;
    shallow: boolean;
    files: number;
  };
  warnings: string[];
  unresolved: { file: string; line: number; specifier: string; reason: string }[];
}

/** La salida del comando: cabecera, métricas, estado guardado y avisos. */
export function reportLines(facts: ReportFacts): string[] {
  const lines = [
    "",
    "  CodArch · análisis",
    "",
    field("raíz", facts.rootPath),
    field(
      "snapshot",
      `${facts.snapshot.path} (${formatBytes(facts.snapshot.bytes)})`
    ),
    ...restLines(facts.rest),
    ...lintLines(facts.lint),
    field(
      "estructura",
      `${num(facts.structure.files)} ficheros · ${num(
        facts.structure.folders
      )} carpetas · ${num(facts.structure.edges)} aristas · ${num(
        facts.structure.cycles
      )} ciclos`
    ),
    field(
      "imports",
      `${num(facts.imports.external)} externos · ${num(
        facts.imports.builtin
      )} builtins · ${num(facts.imports.typeOnly)} type-only · ${num(
        facts.imports.unresolved
      )} sin resolver`
    ),
    field("migración", migrationText(facts.migration)),
    field("parseo", parseText(facts.parse)),
    field("alcances", scopesText(facts.scopes)),
    field("tiempo", `${num(facts.durationMs)} ms`)
  ];

  if (facts.history) {
    lines.push(field("historial", historyText(facts.history)));
  }
  lines.push(field("churn", churnText(facts.churn)));
  lines.push(...warningLines(facts.warnings));
  lines.push(...unresolvedLines(facts.unresolved));
  lines.push("");
  return lines;
}

/**
 * El fichero del resto: dónde quedó, cuánto ocupa y qué tiene.
 *
 * Es una línea más del resumen porque el resto es un artefacto más: quien mira
 * `.codarch/` tiene que saber que hay dos mapas y cuál es cuál.
 */
function restLines(rest: ReportFacts["rest"]): string[] {
  if (!rest) return [];
  return [
    field(
      "resto",
      `${rest.path} (${formatBytes(rest.bytes)}) · ${num(
        rest.files
      )} ficheros · ${num(rest.links)} enlaces`
    )
  ];
}

/**
 * El lint de la pasada, en una línea: dónde quedó y cuánto midió.
 *
 * Con la cobertura (`de N medidos`), el cero es un dato y no una duda
 * (ADR 0098); sin ella, no se enseña.
 */
function lintLines(lint: LintLine): string[] {
  if (lint.kind === "skipped") return [field("lint", "omitido (--no-lint)")];
  if (lint.kind === "none") {
    return [field("lint", "sin medir: el proyecto no declara lint")];
  }
  if (lint.kind === "failed") {
    return [field("lint", `sin medir: ${lint.error}`)];
  }

  const errors = lint.totals?.errors ?? 0;
  const warnings = lint.totals?.warnings ?? 0;
  const info = lint.totals?.info ?? 0;
  const files = lint.totals?.files ?? 0;
  const counts = [
    `${tally(files, "fichero con hallazgos", "ficheros con hallazgos")}${
      lint.measured === undefined ? "" : ` de ${num(lint.measured)} medidos`
    }`,
    tally(errors, "error", "errores"),
    tally(warnings, "aviso", "avisos"),
    ...(info > 0 ? [tally(info, "info", "info")] : []),
    ...(lint.note ? [lint.note] : [])
  ].join(" · ");
  return [field("lint", `${lint.path} (${formatBytes(lint.bytes)}) · ${counts}`)];
}

/** Las líneas de migración: qué hay de cada lengua y cuánto pesa. */
function migrationText(migration: ReportFacts["migration"]): string {
  const languages = migration.languages
    .map(([language, rloc]) => `${language} ${num(rloc)}`)
    .join(" · ");
  return `${languages || "—"} · ${num(migration.bridges)} puentes · ${num(
    migration.ffi
  )} FFI · deuda ${num(migration.debt)}`;
}

/** La caché de parseo de esta pasada, para el análisis que venga por encima. */
function parseText(parse: ReportFacts["parse"]): string {
  if ("error" in parse) {
    return `no se pudo guardar la caché: ${parse.error}`;
  }
  const fromScopes =
    parse.fromScopes > 0
      ? ` · ${num(parse.fromScopes)} de alcances de debajo`
      : "";
  return `${num(parse.hits)} reutilizados · ${num(
    parse.misses
  )} parseados${fromScopes}`;
}

/**
 * Los alcances de debajo (ADR 0089).
 *
 * El padre apunta qué alcances tiene por debajo, y solo se lee hacia abajo: el
 * `.codarch/` del hijo lo escribe quien analiza el hijo.
 */
function scopesText(scopes: ReportFacts["scopes"]): string {
  if ("error" in scopes) return `no se pudo registrar: ${scopes.error}`;
  if (scopes.nested === 0) return "—";
  return `${num(scopes.nested)} anidados${
    scopes.stale > 0 ? ` · ${num(scopes.stale)} con ficheros más nuevos` : ""
  }`;
}

/** La foto de esta pasada en el historial, si se pidió. */
function historyText(history: NonNullable<ReportFacts["history"]>): string {
  if ("error" in history) return `no se pudo guardar: ${history.error}`;
  if ("saved" in history) return `guardado ${history.saved}`;
  return "sin cambios; ya había una foto igual";
}

/** El historial de git: commits, autores y si el clon está recortado. */
function churnText(churn: ReportFacts["churn"]): string {
  if (churn.enabled) {
    return `${num(churn.commits)} commits · ${num(churn.authors)} autores${
      churn.shallow ? " · shallow" : ""
    }`;
  }
  // Sin ficheros analizados no hay a qué atribuir commits: decir «sin git» en
  // un repo git era mentira.
  return churn.files === 0
    ? "sin ficheros que analizar; se omite churn"
    : "sin git; se omite churn";
}

/** Los avisos del análisis, con tope: el resto se cuenta. */
function warningLines(warnings: readonly string[]): string[] {
  const lines = warnings.slice(0, 10).map((warning) => field("aviso", warning));
  if (warnings.length > 10) {
    lines.push(field("aviso", `y ${num(warnings.length - 10)} más`));
  }
  return lines;
}

/** Los imports que no se resolvieron, con tope: el resto se cuenta. */
function unresolvedLines(
  unresolved: ReportFacts["unresolved"]
): string[] {
  const lines = unresolved
    .slice(0, 5)
    .map((issue) =>
      field(
        "sin resolver",
        `${issue.file}:${issue.line} ${issue.specifier} (${issue.reason})`
      )
    );
  if (unresolved.length > 5) {
    lines.push(field("sin resolver", `y ${num(unresolved.length - 5)} más`));
  }
  return lines;
}
