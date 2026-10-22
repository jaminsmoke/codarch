import { renderizar } from "./markdown";

/**
 * Los documentos del repo, leídos en el build (ADR 0034).
 *
 * El glob trae el markdown **en crudo** ✓: la web no pide nada por red ✓,
 * que es lo que hace que funcione en GitHub Pages ✓ ✓.
 */

// Todo el markdown del repo, en crudo, en el build.
const crudos = import.meta.glob("../../../../docs/**/*.md", {
  query: "?raw",
  import: "default",
  eager: true
}) as Record<string, string>;

/** Un documento del repo. */
export interface Documento {
  /** La ruta dentro del repo: `docs/adr/0021-0030/0029-los-addons.md`. */
  ruta: string;
  titulo: string;
  estado: string | null;
  fecha: string | null;
  html: string;
}

/** Una decisión: además, su número y su carpeta. */
export interface Decision extends Documento {
  numero: string;
  carpeta: string;
}

/** El título es el primer `#`; el estado y la fecha, la línea que sigue. */
function cabeceras(markdown: string): {
  titulo: string;
  estado: string | null;
  fecha: string | null;
} {
  const titulo = /^#\s+(.+)$/m.exec(markdown)?.[1]?.trim() ?? "";
  const linea = /^\*\*Estado:\*\*\s*(.+?)\s*·\s*\*\*Fecha:\*\*\s*(.+)$/m.exec(markdown);
  return {
    titulo,
    estado: linea?.[1]?.trim() ?? null,
    fecha: linea?.[2]?.trim() ?? null
  };
}

/**
 * Las claves del glob vienen como `../../../../docs/model.md` ✓; aquí se
 * dejan como `docs/model.md` ✓, que es como se leen y se muestran ✓.
 */
function normalizar(ruta: string): string {
  return ruta.replace(/\\/g, "/").replace(/^.*?docs\//, "docs/");
}

function documento(ruta: string, markdown: string): Documento {
  const { titulo, estado, fecha } = cabeceras(markdown);
  return { ruta, titulo, estado, fecha, html: renderizar(markdown) };
}

/** Todos los documentos, por la ruta del repo. */
export function documentos(): Documento[] {
  return Object.entries(crudos)
    .map(([ruta, markdown]) => documento(normalizar(ruta), markdown))
    .sort((a, b) => a.ruta.localeCompare(b.ruta));
}

/** Las decisiones: los ADR, ordenados por número. */
export function decisiones(): Decision[] {
  const salida: Decision[] = [];
  for (const [ruta, markdown] of Object.entries(crudos)) {
    const limpia = normalizar(ruta);
    const coincide = /docs\/adr\/(\d{4}-\d{4})\/(\d{4})-[a-z0-9-]+\.md$/.exec(limpia);
    if (!coincide) continue;
    salida.push({
      ...documento(limpia, markdown),
      numero: coincide[2] ?? "",
      carpeta: coincide[1] ?? ""
    });
  }
  return salida.sort((a, b) => a.numero.localeCompare(b.numero));
}

/** Una decisión por su número. */
export function decisionPorNumero(numero: string): Decision | undefined {
  return decisiones().find((decision) => decision.numero === numero);
}

/**
 * La hoja de ruta de una decisión: el `<adr>.roadmap.md` que va a su lado ✓.
 */
export function hojaDecision(numero: string): Documento | undefined {
  for (const [ruta, markdown] of Object.entries(crudos)) {
    const limpia = normalizar(ruta);
    if (!/docs\/adr\/\d{4}-\d{4}\/\d{4}-[a-z0-9-]+\.roadmap\.md$/.test(limpia)) {
      continue;
    }
    if (!limpia.startsWith(`docs/adr/`) || !limpia.includes(`/${numero}-`)) continue;
    return documento(limpia, markdown);
  }
  return undefined;
}

/** Los documentos sueltos: los de la raíz de `docs/`. */
export function paginas(): Documento[] {
  return documentos().filter(
    (documento) => /^docs\/[a-z0-9-]+\.md$/.test(documento.ruta)
  );
}

/** Una página por su nombre: `model`, `rules`, `roadmap`… */
export function paginaPorNombre(nombre: string): Documento | undefined {
  return paginas().find((documento) => documento.ruta === `docs/${nombre}.md`);
}
