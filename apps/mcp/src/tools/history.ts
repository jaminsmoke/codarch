// El historial de aristas: qué se movió entre commits y si las cadenas
// guardadas siguen cuadrando con el árbol de hoy.

import {
  historyFileName,
  historyLocation,
  loadChains,
  parseHistoryIndex,
  readHistoryIndex,
  verifyChains,
  type HistoryIndex
} from "@codarch/schema";
import { clampInteger } from "./helpers";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ArchitectureStore } from "../store";
import type {
  VerifyHistoryResult,
  GetHistoryInput,
  GetHistoryResult
} from "./types";

export function getHistory(
  store: ArchitectureStore,
  input: GetHistoryInput = {}
): GetHistoryResult {
  const limit = clampInteger(input.limit, 10, 1, 100);
  const location = historyLocation(store.root);

  let index: HistoryIndex;
  try {
    const raw = readFileSync(location.indexFile, "utf8");
    index = parseHistoryIndex(JSON.parse(raw) as unknown);
  } catch {
    return {
      available: false,
      root: store.root,
      entries: [],
      reason:
        "no hay historial en este repositorio; se guarda con codarch analyze --history"
    };
  }

  const entries = index.entries.slice(-limit).reverse();

  if (!input.snapshot) {
    return { available: true, root: store.root, entries };
  }

  const needle = input.snapshot.trim().toLowerCase();
  const entry = index.entries.find(
    (item) =>
      item.date.toLowerCase().includes(needle) ||
      item.checksum.toLowerCase().startsWith(needle)
  );
  if (!entry) {
    return {
      available: true,
      root: store.root,
      entries,
      reason: `no hay ninguna foto con "${input.snapshot}"`
    };
  }

  const name = historyFileName(entry);
  try {
    const raw = readFileSync(join(location.directory, name), "utf8");
    return {
      available: true,
      root: store.root,
      entries,
      snapshot: JSON.parse(raw) as unknown
    };
  } catch (cause) {
    return {
      available: true,
      root: store.root,
      entries,
      reason: `no se pudo leer la foto: ${(cause as Error).message}`
    };
  }
}

/**
 * La configuración del repo, como la lee el CLI (la guía, §4.9).
 *
 * Responde a "¿qué perfiles, reglas y addons rigen este proyecto?" sin abrir
 * ficheros a mano. Es la otra mitad del mapa: el snapshot dice cómo es el
 * código y la configuración dice qué se espera de él.
 */

export function verifyHistory(
  store: ArchitectureStore
): VerifyHistoryResult {
  const index = readHistoryIndex(store.root);
  if (index.entries.length === 0) {
    return {
      available: false,
      ok: false,
      checked: 0,
      projectHead: "",
      mismatches: [],
      reason:
        "no hay historial en este repositorio; se guarda con `codarch analyze . --history`"
    };
  }

  const chains = loadChains(store.root, index.entries);
  const result = verifyChains(chains, store.snapshot);
  return {
    available: true,
    ok: result.ok,
    checked: result.checked,
    projectHead: result.projectHead,
    mismatches: result.mismatches
  };
}
