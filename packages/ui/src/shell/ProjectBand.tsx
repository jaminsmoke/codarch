import type { RenderMeta } from "@codarch/render/browser";
import type { CodarchApp, WatchState } from "../app/types";
import { Kpi } from "../panels";
import { paintNotice, type PaintNotice } from "../paintNotice";

/**
 * La banda del proyecto: qué está abierto, de qué snapshot sale y sus cifras.
 *
 * La vigilancia se queda al lado del nombre porque es del proyecto, no de la
 * app; el snapshot va debajo, en una línea, con la fuente y los checksums
 * cortos.
 */
export function ProjectBand({ app }: { app: CodarchApp }) {
  const { view, migration, state } = app;
  const projectTitle =
    view.model?.meta.title ?? state.cc?.meta.projectName ?? "Sin snapshot";
  const snapshotLine = snapshotLineOf(state.source, view.model?.meta);
  const notice = paintNotice(
    state.colorMode,
    view.model?.metrics ?? null,
    migration
  );

  return (
    <div className="project-band">
      <div className="project-ident">
        <span className="project-label">Proyecto</span>
        <div className="project-name">
          <h1 title={projectTitle}>{projectTitle}</h1>
          <WatchIndicator watch={state.watch} />
          {notice ? <PaintNoticeChip notice={notice} /> : null}
          <RefreshNotice at={state.refreshedAt} />
        </div>
        {/* El snapshot es del proyecto abierto, no de la app: va bajo el
            nombre, y la vigilancia se queda al lado del nombre. */}
        <span className="project-snapshot mono" title={snapshotLine}>
          {snapshotLine}
        </span>
      </div>
      <div className="project-kpis">
        <Kpi label="ficheros" value={view.model?.fileCount ?? 0} />
        <Kpi label="carpetas" value={view.model?.folderCount ?? 0} />
        <Kpi
          label={view.model?.areaTitle ?? "área"}
          value={view.model?.totalArea ?? 0}
        />
        <Kpi
          label="deuda"
          value={migration?.summary.migrationDebt ?? 0}
          accent={migration ? "debt" : undefined}
        />
      </div>
    </div>
  );
}

/**
 * Lo que identifica al snapshot abierto, en una línea: la fuente y los dos
 * checksums cortos que enseña la banda del proyecto.
 */
function snapshotLineOf(source: string, meta: RenderMeta | undefined): string {
  if (!meta) return source;
  const checksum = meta.checksum ? ` · ${meta.checksum.slice(0, 8)}` : "";
  const commit = meta.commit ? ` · ${meta.commit.slice(0, 8)}` : "";
  return `${source}${checksum}${commit}`;
}

/** Lo que dice cada estado de vigilancia, en la banda del proyecto. */
const WATCH_LABEL: Record<WatchState, string> = {
  live: "live",
  paused: "live en pausa",
  none: "sin vigilancia"
};

const WATCH_TITLE: Record<WatchState, string> = {
  live: "El repositorio se reanaliza al guardar y el mapa se refresca solo.",
  paused: "La vigilancia está en pausa: el mapa no cambia hasta reanalizar.",
  none: "Sin vigilancia: el mapa se actualiza al analizar el repositorio."
};

/**
 * El aviso del refresco en vivo.
 *
 * Un guardado reanaliza el repo y el mapa se pone al día; la vista se queda
 * donde estaba. Esto solo lo dice un momento (la animación se apaga sola, sin
 * temporizadores): no hay diálogo ni nada que cerrar.
 */
function RefreshNotice({ at }: { at: number | null }) {
  // La `key` remonta el nodo en cada refresco, así que la animación empieza de
  // nuevo sin que haya que reiniciarla a mano.
  return (
    <span
      key={at ?? 0}
      className={`refresh-notice${at === null ? "" : " is-new"}`}
      title="El mapa se ha puesto al día con lo que hay en el repositorio."
      aria-live="polite"
    >
      actualizado
    </span>
  );
}

/**
 * El color elegido no se puede pintar con este snapshot.
 *
 * Va al lado de la vigilancia porque describe al proyecto, como ella: el mismo
 * color con otro snapshot sí se pinta. Lo que falta —la lente o la métrica— lo
 * cuenta el `title`, que es donde cabe la explicación.
 */
function PaintNoticeChip({ notice }: { notice: PaintNotice }) {
  return (
    <span className="paint-notice" title={notice.title}>
      {notice.label}
    </span>
  );
}

function WatchIndicator({ watch }: { watch: WatchState }) {
  return (
    <span
      className={`watch-indicator watch-${watch}`}
      title={WATCH_TITLE[watch]}
    >
      <i />
      {WATCH_LABEL[watch]}
    </span>
  );
}
