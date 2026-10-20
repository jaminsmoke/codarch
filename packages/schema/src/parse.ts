import type { CcJson, CcNode } from "./types";

const MAX_DEPTH = 512;

export class CcJsonError extends Error {
  readonly path: string;

  constructor(message: string, path: string) {
    super(`${message} (en ${path})`);
    this.name = "CcJsonError";
    this.path = path;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) throw new CcJsonError("se esperaba un objeto", path);
  return value;
}

function requireString(value: unknown, path: string, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new CcJsonError(`"${field}" debe ser una cadena no vacía`, path);
  }
  return value;
}

/**
 * Valida y normaliza un cc.json 2.x.
 *
 * Lanza `CcJsonError` con la ruta exacta del problema. No es un validador de JSON Schema
 * completo: comprueba la estructura que el producto consume y falla pronto y claro.
 */
export function parseCcJson(input: unknown): CcJson {
  if (!isRecord(input)) throw new CcJsonError("se esperaba un objeto", "$");

  if (!("files" in input) && "data" in input) {
    throw new CcJsonError(
      "cc.json 1.x no está soportado todavía; conviértelo con `ccsh convert`",
      "$"
    );
  }

  const metaRaw = requireRecord(input.meta, "$.meta");
  const apiVersion = requireString(metaRaw.apiVersion, "$.meta.apiVersion", "apiVersion");
  if (!apiVersion.startsWith("2.")) {
    throw new CcJsonError(
      `apiVersion "${apiVersion}" no soportada (se espera 2.x)`,
      "$.meta.apiVersion"
    );
  }

  const filesRaw = input.files;
  if (filesRaw === undefined) throw new CcJsonError('falta "files"', "$");
  const roots = Array.isArray(filesRaw) ? filesRaw : [filesRaw];
  if (roots.length === 0) throw new CcJsonError("el árbol está vacío", "$.files");

  const ids = new Set<string>();

  const validateNode = (value: unknown, path: string, depth: number): CcNode => {
    if (depth > MAX_DEPTH) throw new CcJsonError(`profundidad máxima ${MAX_DEPTH} superada`, path);
    const raw = requireRecord(value, path);
    const id = requireString(raw.id, `${path}.id`, "id");
    if (ids.has(id)) throw new CcJsonError(`id duplicado "${id}"`, `${path}.id`);
    ids.add(id);

    const name = requireString(raw.name, `${path}.name`, "name");
    const type = raw.type;
    if (type !== "File" && type !== "Folder") {
      throw new CcJsonError('"type" debe ser "File" o "Folder"', `${path}.type`);
    }

    const node: CcNode = { id, name, type };
    if (typeof raw.contentHash === "string") node.contentHash = raw.contentHash;
    if (typeof raw.link === "string") node.link = raw.link;

    if (raw.children !== undefined) {
      if (!Array.isArray(raw.children)) {
        throw new CcJsonError('"children" debe ser un array', `${path}.children`);
      }
      node.children = raw.children.map((child, index) =>
        validateNode(child, `${path}.children[${index}]`, depth + 1)
      );
    }

    return node;
  };

  const files = roots.map((root, index) => validateNode(root, `$.files[${index}]`, 0));

  const lensesRaw = input.lenses;
  if (lensesRaw !== undefined) {
    const lenses = requireRecord(lensesRaw, "$.lenses");

    if (lenses.metrics !== undefined) {
      const metrics = requireRecord(lenses.metrics, "$.lenses.metrics");
      const attributes = requireRecord(metrics.attributes, "$.lenses.metrics.attributes");
      for (const [nodeId, values] of Object.entries(attributes)) {
        const row = requireRecord(values, `$.lenses.metrics.attributes["${nodeId}"]`);
        for (const [metric, value] of Object.entries(row)) {
          if (typeof value !== "number" || !Number.isFinite(value)) {
            throw new CcJsonError(
              `la métrica "${metric}" debe ser un número finito`,
              `$.lenses.metrics.attributes["${nodeId}"].${metric}`
            );
          }
        }
      }
    }

    if (lenses.dependency !== undefined) {
      const dependency = requireRecord(lenses.dependency, "$.lenses.dependency");
      if (dependency.edges !== undefined) {
        if (!Array.isArray(dependency.edges)) {
          throw new CcJsonError('"edges" debe ser un array', "$.lenses.dependency.edges");
        }
        dependency.edges.forEach((edge, index) => {
          const path = `$.lenses.dependency.edges[${index}]`;
          const raw = requireRecord(edge, path);
          requireString(raw.fromId, `${path}.fromId`, "fromId");
          requireString(raw.toId, `${path}.toId`, "toId");
        });
      }
    }
  }

  const meta = { ...metaRaw, apiVersion } as CcJson["meta"];

  return {
    meta,
    files,
    ...(lensesRaw !== undefined ? { lenses: lensesRaw as CcJson["lenses"] } : {})
  };
}
