import type { CcMember, CcStructureNode } from "@codarch/schema/browser";

/**
 * Los resúmenes de las secciones que no son símbolos (ADR 0064).
 *
 * Son funciones puras: la ficha solo las pinta. Así el plegado y la cuenta se
 * prueban sin montar el DOM.
 */

export interface MemberGroup {
  owner: string;
  members: CcMember[];
}

/** Agrupa los miembros por clase, en el orden en que aparecen. */
export function groupMembers(members: readonly CcMember[]): MemberGroup[] {
  const groups = new Map<string, CcMember[]>();
  for (const member of members) {
    const list = groups.get(member.owner) ?? [];
    list.push(member);
    groups.set(member.owner, list);
  }
  return [...groups.entries()].map(([owner, list]) => ({
    owner,
    members: list.sort((left, right) => left.line - right.line)
  }));
}

/** Cuántos imports y exports tiene el fichero. */
export function surfaceCount(structure: CcStructureNode): number {
  return structure.imports.length + structure.exports.length;
}

/** «3 imports · 2 exports», o solo lo que haya. */
export function surfaceSummary(
  structure: CcStructureNode
): string | undefined {
  const parts: string[] = [];
  if (structure.imports.length > 0) {
    parts.push(
      `${structure.imports.length} import${
        structure.imports.length === 1 ? "" : "s"
      }`
    );
  }
  if (structure.exports.length > 0) {
    parts.push(
      `${structure.exports.length} export${
        structure.exports.length === 1 ? "" : "s"
      }`
    );
  }
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

/**
 * «Store 21 · PendingAnalyses 3», con las tres clases primeras.
 *
 * Si hay más, se dice cuántas quedan: el resumen es para leerlo de un vistazo,
 * no para repetir la lista.
 */
export function memberSummary(
  members: readonly CcMember[]
): string | undefined {
  if (members.length === 0) return undefined;
  const groups = groupMembers(members);
  const visible = groups.slice(0, 3).map(
    (group) => `${group.owner} ${group.members.length}`
  );
  const remaining = groups.length - visible.length;
  if (remaining > 0) visible.push(`+${remaining}`);
  return visible.join(" · ");
}
