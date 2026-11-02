import {
  CODARCH_DIR,
  LINT_FILE,
  REPORT_FILE,
  REST_FILE,
  REST_LINT_FILE,
  SNAPSHOT_FILE
} from "@codarch/schema/browser";

export interface DirectoryHandleLike {
  name: string;
  getDirectoryHandle(
    name: string,
    options?: { create?: boolean }
  ): Promise<DirectoryHandleLike>;
  getFileHandle(
    name: string,
    options?: { create?: boolean }
  ): Promise<FileHandleLike>;
}

export interface FileHandleLike {
  getFile(): Promise<File>;
}

type DirectoryPicker = (options?: {
  mode?: "read" | "readwrite";
}) => Promise<DirectoryHandleLike>;

type WindowWithDirectoryPicker = Window & {
  showDirectoryPicker?: DirectoryPicker;
};

export interface RepositoryArtifacts {
  snapshot: unknown;
  /** El mapa de lo que no es código, si el repo lo dejó (ADR 0093). */
  rest: unknown | null;
  /** El lint del repo, si se ejecutó `codarch lint` (ADR 0094). */
  lint: unknown | null;
  /** Las reglas del resto, si `codarch analyze` las midió (ADR 0105). */
  restLint: unknown | null;
  report: unknown | null;
  label: string;
  reportLabel: string | null;
}

/**
 * Carga los artefactos de un repositorio usando el selector de carpetas del
 * navegador. No analiza código: lee `.codarch/snapshot.cc.json` y, si existen,
 * `.codarch/rest.cc.json` y `.codarch/report.json`.
 */
export async function readRepositoryFromPicker(): Promise<RepositoryArtifacts> {
  const picker = (window as WindowWithDirectoryPicker).showDirectoryPicker;
  if (!picker) {
    throw new Error(
      "Este navegador no permite seleccionar carpetas. Abre el snapshot.cc.json o usa Chrome/Edge."
    );
  }

  const root = await picker({ mode: "read" });
  let codarch: DirectoryHandleLike;
  try {
    codarch = await root.getDirectoryHandle(CODARCH_DIR);
  } catch {
    throw new Error(
      `No se encontró .codarch en "${root.name}". Para artefactos ejecuta "codarch analyze ."; para datos en vivo, "codarch serve ." en la raíz del repo.`
    );
  }

  const snapshot = await readJson(codarch, SNAPSHOT_FILE, true);
  const rest = await readJson(codarch, REST_FILE, false);
  const lint = await readJson(codarch, LINT_FILE, false);
  const restLint = await readJson(codarch, REST_LINT_FILE, false);
  const report = await readJson(codarch, REPORT_FILE, false);

  return {
    snapshot,
    rest,
    lint,
    restLint,
    report,
    label: `${root.name}/${CODARCH_DIR}/${SNAPSHOT_FILE}`,
    reportLabel:
      report === null ? null : `${root.name}/${CODARCH_DIR}/${REPORT_FILE}`
  };
}

/**
 * Fallback para navegadores sin File System Access API: usa el atributo
 * `webkitdirectory` y busca los artefactos entre los ficheros seleccionados.
 */
export async function readRepositoryFromFiles(
  files: readonly File[]
): Promise<RepositoryArtifacts> {
  const entries = files.map((file) => ({
    file,
    path: (file.webkitRelativePath || file.name).replace(/\\/g, "/")
  }));

  /** El artefacto de `.codarch/`, esté en la raíz elegida o en una subcarpeta. */
  const find = (name: string) => {
    const suffix = `${CODARCH_DIR}/${name}`;
    return entries.find(
      (entry) => entry.path === suffix || entry.path.endsWith(`/${suffix}`)
    );
  };

  const snapshotEntry = find(SNAPSHOT_FILE);
  if (!snapshotEntry) {
    throw new Error(
      `No se encontró "${CODARCH_DIR}/${SNAPSHOT_FILE}" en la carpeta. Para artefactos ejecuta "codarch analyze ."; para datos en vivo, "codarch serve ." en la raíz del repo.`
    );
  }

  const restEntry = find(REST_FILE);
  const lintEntry = find(LINT_FILE);
  const restLintEntry = find(REST_LINT_FILE);
  const reportEntry = find(REPORT_FILE);

  return {
    snapshot: await readFileJson(snapshotEntry.file),
    rest: restEntry ? await readFileJson(restEntry.file) : null,
    lint: lintEntry ? await readFileJson(lintEntry.file) : null,
    restLint: restLintEntry ? await readFileJson(restLintEntry.file) : null,
    report: reportEntry ? await readFileJson(reportEntry.file) : null,
    label: snapshotEntry.path,
    reportLabel: reportEntry?.path ?? null
  };
}

async function readJson(
  directory: DirectoryHandleLike,
  name: string,
  required: boolean
): Promise<unknown | null> {
  try {
    const handle = await directory.getFileHandle(name);
    return await readFileJson(await handle.getFile());
  } catch (cause) {
    if (!required) return null;
    throw new Error(
      `No se pudo leer ${name}: ${(cause as Error).message}`
    );
  }
}

async function readFileJson(file: File): Promise<unknown> {
  return JSON.parse(await file.text());
}
