/**
 * El lint mínimo recomendable por lenguaje (ADR 0096).
 *
 * Es una recomendación, no una medida: CodArch no escribe configuración ni
 * ejecuta herramientas que el repo no tenga. Cuando no hay artefacto, la app
 * enseña esta tabla para los lenguajes que ve en el mapa, y el riesgo sigue
 * sin dar peso al lint porque «sin medir» no es «limpio».
 */

export interface LintAdvice {
  /** El lenguaje o la familia del stack. */
  language: string;
  /** Las extensiones que lo delatan, sin punto y en minúsculas. */
  extensions: readonly string[];
  /** La herramienta mínima. */
  tool: string;
  /** La configuración mínima, en una línea. */
  config: string;
}

export const MINIMAL_LINT: readonly LintAdvice[] = [
  {
    language: "TypeScript y JavaScript",
    extensions: ["ts", "tsx", "js", "jsx", "mjs", "cjs"],
    tool: "ESLint + typescript-eslint",
    config: "eslint.config.mjs con `typescript-eslint` en `recommended`"
  },
  {
    language: "Python",
    extensions: ["py"],
    tool: "Ruff",
    config: "`pyproject.toml` con `[tool.ruff.lint] select = [\"E\", \"F\"]`"
  },
  {
    language: "Go",
    extensions: ["go"],
    tool: "go vet + staticcheck",
    config: "sin configuración: `go vet ./...` y staticcheck en CI"
  },
  {
    language: "Java",
    extensions: ["java"],
    tool: "Checkstyle",
    config: "`google_checks.xml`"
  },
  {
    language: "C#",
    extensions: ["cs"],
    tool: "Analyzers de .NET",
    config: "`AnalysisLevel=latest-recommended` en `Directory.Build.props`"
  }
];

/** La extensión de un nombre o ruta, sin punto y en minúsculas. */
export function extensionOf(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot <= 0 ? "" : base.slice(dot + 1).toLowerCase();
}

/** Las recomendaciones que tocan a los lenguajes presentes, sin repetir. */
export function adviceForExtensions(
  extensions: Iterable<string>
): LintAdvice[] {
  const present = new Set(
    [...extensions].map((extension) => extension.replace(/^\./, "").toLowerCase())
  );
  return MINIMAL_LINT.filter((advice) =>
    advice.extensions.some((extension) => present.has(extension))
  );
}
