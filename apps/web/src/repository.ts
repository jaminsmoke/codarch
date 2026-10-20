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
  report: unknown | null;
  label: string;
  reportLabel: string | null;
}

/**
 * Carga los artefactos de un repositorio usando el selector de carpetas del
 * navegador. No analiza código: lee `.codarch/snapshot.cc.json` y, si existe,
 * `.codarch/report.json`.
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
    codarch = await root.getDirectoryHandle(".codarch");
  } catch {
    throw new Error(
      `No se encontró .codarch en "${root.name}". Ejecuta "codarch analyze ." en ese repositorio o abre el cc.json.`
    );
  }

  const snapshot = await readJson(codarch, "snapshot.cc.json", true);
  const report = await readJson(codarch, "report.json", false);

  return {
    snapshot,
    report,
    label: `${root.name}/.codarch/snapshot.cc.json`,
    reportLabel: report === null ? null : `${root.name}/.codarch/report.json`
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

  const snapshotEntry = entries.find(
    (entry) =>
      entry.path.endsWith("/.codarch/snapshot.cc.json") ||
      entry.path === ".codarch/snapshot.cc.json"
  );
  if (!snapshotEntry) {
    throw new Error(
      'No se encontró ".codarch/snapshot.cc.json" en la carpeta. Ejecuta "codarch analyze ." primero.'
    );
  }

  const reportEntry = entries.find(
    (entry) =>
      entry.path.endsWith("/.codarch/report.json") ||
      entry.path === ".codarch/report.json"
  );

  return {
    snapshot: await readFileJson(snapshotEntry.file),
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
