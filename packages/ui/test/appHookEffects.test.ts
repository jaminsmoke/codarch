/**
 * @vitest-environment jsdom
 *
 * El hook tiene efectos que no se ven en un render de servidor: cargar
 * documentos, restaurar el proyecto guardado y escuchar los atajos. Aquí se
 * monta con un DOM de verdad y se miran sus consecuencias.
 */
import { act, fireEvent, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  CC_JSON_VERSION,
  fileId,
  folderId,
  parseCcJson,
  type CcJson,
  type CcNode
} from "@codarch/schema/browser";
import type { Plataforma } from "../src/platform";
import type { SavedProject } from "../src/storage";
import { useCodarchApp } from "../src/useCodarchApp";

/** Un snapshot de código con los ficheros y métricas que se digan. */
function snapshot(
  checksum: string,
  files: Array<{ path: string; metrics: Record<string, number> }>,
  historyChecksum?: string
): CcJson {
  const root: CcNode = {
    id: folderId(""),
    name: "demo",
    type: "Folder",
    children: []
  };
  const folders = new Map<string, CcNode>([["", root]]);
  const attributes: Record<string, Record<string, number>> = {};

  for (const file of files) {
    const segments = file.path.split("/");
    const leaf = segments.pop();
    if (!leaf) continue;
    let parent = root;
    let parentPath = "";
    for (const segment of segments) {
      const folderPath = parentPath ? `${parentPath}/${segment}` : segment;
      let folder = folders.get(folderPath);
      if (!folder) {
        folder = {
          id: folderId(folderPath),
          name: segment,
          type: "Folder",
          children: []
        };
        folders.set(folderPath, folder);
        parent.children?.push(folder);
      }
      parent = folder;
      parentPath = folderPath;
    }
    const node: CcNode = { id: fileId(file.path), name: leaf, type: "File" };
    parent.children?.push(node);
    attributes[node.id] = file.metrics;
  }

  return parseCcJson({
    meta: {
      projectName: "demo",
      apiVersion: CC_JSON_VERSION,
      checksum,
      ...(historyChecksum ? { historyChecksum } : {})
    },
    files: [root],
    lenses: { metrics: { attributes } }
  });
}

const FILES = [
  {
    path: "src/a.ts",
    metrics: { rloc: 10, loc: 12, fanIn: 2, maxComplexity: 3 }
  },
  {
    path: "src/b.ts",
    metrics: { rloc: 30, loc: 34, fanIn: 5, maxComplexity: 4 }
  }
];

/** Una plataforma que apunta lo que le piden, sin nada opcional. */
function plataforma(extra: Partial<Plataforma> = {}) {
  const escritos: SavedProject[] = [];
  const base: Plataforma = {
    leerPreferencias: () => null,
    escribirPreferencias: () => {},
    leerProyecto: () => null,
    escribirProyecto: (project) => {
      escritos.push(project);
      return true;
    },
    borrarProyecto: () => {},
    plugins: { read: () => [], write: () => {} },
    ...extra
  };
  return { plataforma: base, escritos };
}

describe("la carga de documentos", () => {
  it("abre un snapshot, decide su vista y deja de cargar", () => {
    const { plataforma: platform } = plataforma();
    const { result } = renderHook(() => useCodarchApp(platform));

    expect(result.current.state.loading).toBe(true);

    let ok = false;
    act(() => {
      ok = result.current.actions.loadSnapshot(snapshot("sum-1", FILES), "demo");
    });

    expect(ok).toBe(true);
    expect(result.current.state.source).toBe("demo");
    expect(result.current.state.loading).toBe(false);
    expect(result.current.state.error).toBeNull();
    // El área la decide el plan del snapshot: `rloc` es la de siempre.
    expect(result.current.state.areaMetric).toBe("rloc");
    expect(result.current.state.colorMode).toBe("risk");
    expect(result.current.view.model?.files).toHaveLength(2);
    expect(result.current.detail?.visibleFiles).toBe(2);
  });

  it("un fichero que no es un snapshot se dice y no deja el mapa a medias", () => {
    const { plataforma: platform } = plataforma();
    const { result } = renderHook(() => useCodarchApp(platform));

    let ok = true;
    act(() => {
      ok = result.current.actions.loadSnapshot({ nope: true }, "roto.json");
    });

    expect(ok).toBe(false);
    expect(result.current.state.error).toBeTruthy();
    expect(result.current.state.loading).toBe(false);
    expect(result.current.view.model).toBeNull();
  });

  it("abrir un proyecto lo guarda y tira el reporte anterior", () => {
    const { plataforma: platform, escritos } = plataforma();
    const { result } = renderHook(() => useCodarchApp(platform));

    act(() => {
      result.current.actions.abrirSnapshot(snapshot("sum-1", FILES), "demo");
    });

    expect(escritos).toHaveLength(1);
    expect(escritos[0]?.label).toBe("demo");
    expect(result.current.state.report).toBeNull();
    expect(result.current.state.tab).toBe("file");
  });
});

/** Un snapshot del resto: se mide en bytes y se pinta por tipo (ADR 0093). */
function restSnapshot(): CcJson {
  return parseCcJson({
    meta: { projectName: "demo", apiVersion: CC_JSON_VERSION, checksum: "rest-1" },
    files: [
      {
        id: folderId(""),
        name: "demo",
        type: "Folder",
        children: [
          { id: fileId("README.md"), name: "README.md", type: "File" }
        ]
      }
    ],
    lenses: {
      rest: { files: 1, bytes: 120, kinds: { document: 1 } },
      metrics: { attributes: { [fileId("README.md")]: { bytes: 120 } } }
    }
  });
}

/** Un artefacto de lint medido y limpio (ADR 0094). */
function lintArtifact() {
  return {
    schemaVersion: "1.2",
    meta: { checksum: "sum-1", tools: ["eslint"], systems: [] },
    files: {},
    summary: { files: 0, errors: 0, warnings: 0, messages: 0, measured: 2 }
  };
}

describe("el lint y el resto del proyecto", () => {
  it("el lint cargado añade su lente al selector de color", () => {
    const { plataforma: platform } = plataforma();
    const { result } = renderHook(() => useCodarchApp(platform));

    act(() => {
      result.current.actions.loadSnapshot(snapshot("sum-1", FILES), "demo");
    });
    expect(result.current.colorOptions.map((option) => option.value)).not.toContain(
      "lint"
    );

    act(() => {
      result.current.actions.loadLint(lintArtifact());
    });

    expect(result.current.state.lint).not.toBeNull();
    expect(result.current.colorOptions.map((option) => option.value)).toContain(
      "lint"
    );
  });

  it("el mapa del resto se abre por bytes y vuelve al código con otro proyecto", () => {
    const { plataforma: platform } = plataforma();
    const { result } = renderHook(() => useCodarchApp(platform));

    act(() => {
      result.current.actions.loadSnapshot(snapshot("sum-1", FILES), "demo");
      result.current.actions.loadRest(restSnapshot());
    });
    act(() => result.current.actions.setMap("rest"));

    expect(result.current.state.map).toBe("rest");
    expect(result.current.state.areaMetric).toBe("bytes");
    expect(result.current.state.colorMode).toBe("kind");

    // Otro proyecto, sin resto: no se puede seguir en un mapa que ya no está.
    act(() => {
      result.current.actions.loadSnapshot(snapshot("sum-9", FILES), "otro");
    });

    expect(result.current.state.rest).toBeNull();
    expect(result.current.state.map).toBe("code");
  });
});

describe("una vista pedida (un enlace o un addon)", () => {
  it("aplica lo que el mapa tiene e ignora lo que no", () => {
    const { plataforma: platform } = plataforma();
    const { result } = renderHook(() => useCodarchApp(platform));

    act(() => {
      result.current.actions.loadSnapshot(snapshot("sum-1", FILES), "demo");
    });
    act(() => {
      result.current.applyView({
        areaMetric: "fanIn",
        colorMode: "loc",
        focusPath: null,
        filePath: "src/b.ts",
        folderPath: null,
        openFilePath: null,
        tab: "changes",
        symbolName: null,
        showLabels: false
      });
    });

    expect(result.current.state.areaMetric).toBe("fanIn");
    expect(result.current.state.colorMode).toBe("loc");
    expect(result.current.selectedFile?.path).toBe("src/b.ts");
    expect(result.current.state.tab).toBe("changes");
    expect(result.current.state.showLabels).toBe(false);
  });
});

describe("el refresco del live", () => {
  it("avisa cuando llega otro árbol y no mueve la vista", () => {
    const { plataforma: platform } = plataforma();
    const { result } = renderHook(() => useCodarchApp(platform));

    act(() => {
      result.current.actions.loadSnapshot(snapshot("sum-1", FILES), "demo");
      result.current.actions.setAreaMetric("fanIn");
      result.current.actions.setColorMode("loc");
    });
    act(() => {
      result.current.actions.loadSnapshot(snapshot("sum-2", FILES), "demo", true);
    });

    expect(result.current.state.refreshedAt).not.toBeNull();
    // El área y el color que se miraban siguen, porque el snapshot los trae.
    expect(result.current.state.areaMetric).toBe("fanIn");
    expect(result.current.state.colorMode).toBe("loc");
  });

  it("avisa cuando el mismo árbol trae otro historial", () => {
    const { plataforma: platform } = plataforma();
    const { result } = renderHook(() => useCodarchApp(platform));

    act(() => {
      result.current.actions.loadSnapshot(
        snapshot("sum-1", FILES, "hist-1"),
        "demo"
      );
    });
    act(() => {
      result.current.actions.loadSnapshot(
        snapshot("sum-1", FILES, "hist-2"),
        "demo",
        true
      );
    });

    // El código es el mismo, pero el calor no: hay algo nuevo que contar.
    expect(result.current.state.refreshedAt).not.toBeNull();
  });

  it("con el mismo árbol y el mismo historial no hay nada que avisar", () => {
    const { plataforma: platform } = plataforma();
    const { result } = renderHook(() => useCodarchApp(platform));

    act(() => {
      result.current.actions.loadSnapshot(
        snapshot("sum-1", FILES, "hist-1"),
        "demo"
      );
    });
    act(() => {
      result.current.actions.loadSnapshot(
        snapshot("sum-1", FILES, "hist-1"),
        "demo",
        true
      );
    });

    expect(result.current.state.refreshedAt).toBeNull();
  });

  it("abrir otro proyecto respeta el área de las preferencias y no es un refresco", () => {
    const { plataforma: platform } = plataforma();
    const { result } = renderHook(() => useCodarchApp(platform));

    act(() => {
      result.current.actions.loadSnapshot(snapshot("sum-1", FILES), "demo");
      result.current.actions.setAreaMetric("fanIn");
    });
    act(() => {
      result.current.actions.loadSnapshot(snapshot("sum-3", FILES), "otro");
    });

    expect(result.current.state.source).toBe("otro");
    // El área es una preferencia de la máquina (ADR 0053): el proyecto nuevo
    // abre con la que se estaba mirando, porque su snapshot también la trae.
    expect(result.current.state.areaMetric).toBe("fanIn");
    expect(result.current.state.refreshedAt).toBeNull();
  });
});

describe("los atajos", () => {
  it("`/` lleva el foco al buscador", () => {
    const { plataforma: platform } = plataforma();
    const { result } = renderHook(() => useCodarchApp(platform));
    const input = document.createElement("input");
    document.body.append(input);
    result.current.searchRef.current = input;

    fireEvent.keyDown(window, { key: "/" });

    expect(document.activeElement).toBe(input);
    input.remove();
  });

  it("`Ctrl+,` abre los ajustes", () => {
    const { plataforma: platform } = plataforma();
    const { result } = renderHook(() => useCodarchApp(platform));

    fireEvent.keyDown(window, { key: ",", ctrlKey: true });

    expect(result.current.state.settingsOpen).toBe(true);
  });

  it("`Escape` suelta la búsqueda, el foco y la selección", () => {
    const { plataforma: platform } = plataforma();
    const { result } = renderHook(() => useCodarchApp(platform));

    act(() => {
      result.current.actions.loadSnapshot(snapshot("sum-1", FILES), "demo");
      result.current.actions.setQuery("src");
      result.current.actions.setFocusPath("src");
      result.current.actions.selectIndex(1);
    });
    expect(result.current.state.query).toBe("src");

    fireEvent.keyDown(window, { key: "Escape" });

    expect(result.current.state.query).toBe("");
    expect(result.current.state.focusPath).toBeNull();
    expect(result.current.state.selectedIndex).toBeNull();
  });
});

describe("el proyecto guardado", () => {
  it("se restaura al montar, con su rótulo", async () => {
    const { plataforma: platform } = plataforma({
      restaurarProyecto: async () => ({
        snapshot: snapshot("sum-1", FILES),
        report: null,
        label: "guardado",
        reportLabel: null,
        addons: []
      })
    });
    const { result } = renderHook(() => useCodarchApp(platform));

    await waitFor(() => expect(result.current.state.source).toBe("guardado"));

    expect(result.current.state.loading).toBe(false);
    expect(result.current.view.model?.files).toHaveLength(2);
  });

  it("un proyecto que ya no se puede abrir se borra", async () => {
    const borrados: number[] = [];
    const { plataforma: platform } = plataforma({
      restaurarProyecto: async () => ({
        snapshot: { roto: true },
        report: null,
        label: "viejo",
        reportLabel: null
      }),
      borrarProyecto: () => borrados.push(1)
    });
    const { result } = renderHook(() => useCodarchApp(platform));

    await waitFor(() => expect(borrados).toHaveLength(1));
    expect(result.current.state.error).toBeTruthy();
    expect(result.current.state.loading).toBe(false);
  });
});
