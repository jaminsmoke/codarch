import type { HealthSnapshot, LintArtifact } from "@codarch/lint/browser";
import type { DiffReport } from "@codarch/metrics/browser";
import type { RenderModel, TreeNode } from "@codarch/render/browser";
import {
  boundarySummary,
  cyclesSummary,
  edgesOf,
  folderBoundary,
  folderCycles,
  type BoundaryFile
} from "../boundary";
import { changeCountFor } from "../changeFiles";
import { CollapsibleSection, GroupHead } from "../CollapsibleSection";
import {
  childFolderNodes,
  childFolders,
  folderContent,
  folderDepth
} from "../folder";
import { healthSnapshot } from "../lintHealth";
import { withinFolder } from "../lintRollup";
import { LintSection } from "../LintSection";
import { DuplicationSection } from "./DuplicationSection";
import { MetricsRollup } from "./MetricsRollup";

/**
 * La hoja de la carpeta: su propia entrada en la barra de actividad (ADR 0092).
 *
 * Lo que se puede decir de una carpeta: cuántos ficheros tiene, a qué
 * profundidad está, sus totales —sumas, no p95: ficheros, líneas, complejidad
 * máxima y la deuda de lint del subárbol— y qué hay dentro, en el orden del
 * treemap (ADR 0095). La tabla de carpetas de Métricas es el descenso: cada
 * fila abre la ficha de esa carpeta, que cuenta lo mismo de su subárbol.
 *
 * No lleva símbolos, miembros, código ni cadena: una carpeta no tiene cuerpo, y
 * para llegar a un símbolo se entra. Por eso no es la hoja del fichero con otro
 * sujeto: casi ninguna sección sería la misma.
 */
export function FolderPanel({
  folder,
  model,
  lint,
  docsLint = null,
  codeSnapshot,
  docsSnapshot,
  rulesMode = false,
  changes,
  metricTitle,
  colorMode,
  onColorMode,
  onSelectPath,
  onSelectFolder,
  onScopeChanges
}: {
  folder: TreeNode | null;
  model: RenderModel | null;
  /** El lint del código. */
  lint: LintArtifact | null;
  /** Las reglas de docs, listadas en la misma sección. */
  docsLint?: LintArtifact | null;
  codeSnapshot?: HealthSnapshot;
  docsSnapshot?: HealthSnapshot;
  /** En el resto, el bloque de métricas no cuenta el lint del código como «sin medir». */
  rulesMode?: boolean;
  /** Los ficheros del cambio, para contar los de esta carpeta (ADR 0092). */
  changes: DiffReport["files"] | null;
  /** Cómo se llama cada métrica en el snapshot. */
  metricTitle: (key: string) => string;
  colorMode: string;
  onColorMode: (mode: string) => void;
  /** Selecciona un fichero del contenido. */
  onSelectPath: (path: string) => void;
  /** Selecciona una carpeta del contenido. */
  onSelectFolder: (path: string) => void;
  /** Acota la pestaña de cambios a esta carpeta y la abre. */
  onScopeChanges: (path: string) => void;
}) {
  if (!folder) return <EmptyFolder model={model} />;

  const content = folderContent(folder);
  const files = folder.fileCount;
  const folders = childFolders(folder);
  const areaTitle = model?.areaTitle ?? "área";
  const subtree = model
    ? model.files.filter((file) => withinFolder(folder.path, file.path))
    : [];
  const boundary = model ? folderBoundary(model, folder.path) : null;
  const cycles = model ? folderCycles(model, folder.path) : null;
  const changesHere = changes ? changeCountFor(changes, folder.path) : 0;

  return (
    <section className="inspector-file inspector-folder">
      <div className="inspector-path" title={folder.path}>
        {folder.path}
      </div>
      <h2>{folder.name} /</h2>

      <div className="inspector-status">
        <span className="mono">{files} ficheros</span>
        <span className="mono">nivel {folderDepth(folder.path)}</span>
        {folders > 0 ? <span className="mono">{folders} carpetas dentro</span> : null}
      </div>

      {model ? (
        <MetricsRollup
          id="folder"
          model={model}
          files={subtree}
          folders={childFolderNodes(folder)}
          lint={rulesMode ? null : lint}
          docsLint={docsLint}
          folder={folder.path}
          metricTitle={metricTitle}
          colorMode={colorMode}
          onColorMode={onColorMode}
          onSelectFolder={onSelectFolder}
        />
      ) : null}

      {model ? (
        <DuplicationSection
          id="folder"
          model={model}
          files={subtree}
          onSelectPath={onSelectPath}
        />
      ) : null}

      {boundary ? (
        <CollapsibleSection
          id="folder-boundary"
          title="Frontera"
          className="section-boundary"
          count={
            boundary.incoming.length + boundary.outgoing.length || undefined
          }
          summary={boundarySummary(boundary)}
        >
          <div className="dependency-list">
            {boundary.incoming.length > 0 ? (
              <div className="dependency-group">
                <GroupHead
                  label="Entrantes desde fuera"
                  summary={String(edgesOf(boundary.incoming))}
                />
                {boundary.incoming.map((file) => (
                  <BoundaryRow
                    key={file.path}
                    file={file}
                    onSelectPath={onSelectPath}
                  />
                ))}
              </div>
            ) : null}
            {boundary.outgoing.length > 0 ? (
              <div className="dependency-group">
                <GroupHead
                  label="Salientes hacia fuera"
                  summary={String(edgesOf(boundary.outgoing))}
                />
                {boundary.outgoing.map((file) => (
                  <BoundaryRow
                    key={file.path}
                    file={file}
                    onSelectPath={onSelectPath}
                  />
                ))}
              </div>
            ) : null}
            {boundary.incoming.length + boundary.outgoing.length === 0 ? (
              <p className="muted small">
                {boundary.internal > 0
                  ? "Ninguna arista cruza la frontera: lo que esta carpeta usa y lo que la usa está dentro."
                  : "Sin aristas: ni imports dentro ni dependencias que la crucen."}
              </p>
            ) : null}
            <p className="muted tiny card-note">
              {`${boundary.internal} ${
                boundary.internal === 1 ? "arista" : "aristas"
              } con los dos extremos dentro. Pulsa una ruta de fuera para abrir ese fichero.`}
            </p>
          </div>
        </CollapsibleSection>
      ) : null}

      {cycles && (cycles.inside > 0 || cycles.crossing.length > 0) ? (
        <CollapsibleSection
          id="folder-cycles"
          title="Ciclos"
          className="section-cycles"
          count={cycles.inside + edgesOf(cycles.crossing)}
          summary={cyclesSummary(cycles)}
        >
          <div className="dependency-list">
            {cycles.crossing.length > 0 ? (
              <div className="dependency-group">
                <GroupHead
                  label="Que la cruzan"
                  summary={String(edgesOf(cycles.crossing))}
                />
                {cycles.crossing.map((file) => (
                  <BoundaryRow
                    key={file.path}
                    file={file}
                    onSelectPath={onSelectPath}
                  />
                ))}
              </div>
            ) : null}
            <p className="muted tiny card-note">
              {cycles.inside > 0
                ? `${cycles.inside} ${
                    cycles.inside === 1
                      ? "arista cierra un ciclo"
                      : "aristas cierran ciclos"
                  } dentro: se arreglan sin salir de la carpeta. `
                : "Ningún ciclo cae entero dentro de la carpeta. "}
              Cada cuenta es una arista que cierra un ciclo; el mapa no guarda el
              ciclo entero.
            </p>
          </div>
        </CollapsibleSection>
      ) : null}

      {model ? (
        <LintSection
          id="folder-lint"
          code={lint}
          docs={docsLint}
          folder={folder.path}
          codeSnapshot={codeSnapshot ?? healthSnapshot(model)}
          docsSnapshot={docsSnapshot}
          onSelectPath={onSelectPath}
        />
      ) : null}

      {changesHere > 0 ? (
        <button
          type="button"
          className="folder-changes"
          title={`${changesHere} ${
            changesHere === 1 ? "fichero tocado" : "ficheros tocados"
          } en Cambios · abre la pestaña acotada a ${folder.path}`}
          onClick={() => onScopeChanges(folder.path)}
        >
          <span className="mono folder-changes-count">{changesHere}</span>
          <span className="folder-changes-text">
            {changesHere === 1 ? "fichero tocado" : "ficheros tocados"} en esta
            carpeta
          </span>
          <span className="folder-changes-open" aria-hidden="true">
            Ver en Cambios →
          </span>
        </button>
      ) : null}

      {content.rows.length > 0 ? (
        <CollapsibleSection
          id="folder-content"
          title="Contenido"
          className="section-content"
          count={content.rows.length}
          summary={`${folders} carpetas · ${files} ficheros`}
        >
          <div className="folder-content" role="group" aria-label="Contenido de la carpeta">
            <div className="folder-head" aria-hidden="true">
              <span>Nombre</span>
              <span>{areaTitle}</span>
            </div>
            {content.rows.map((row) => (
              <button
                key={row.key}
                type="button"
                className={`folder-row folder-row-${row.kind}`}
                onClick={() =>
                  row.kind === "folder"
                    ? onSelectFolder(row.path)
                    : onSelectPath(row.path)
                }
                title={`${row.path} · ${Math.round(row.share * 100)}% del área${
                  row.kind === "folder" ? " · pulsa para abrir su ficha" : ""
                }`}
              >
                <span className="folder-row-name" title={row.name}>
                  {row.name}
                  {row.kind === "folder" ? "/" : null}
                </span>
                <span className="folder-bar" aria-hidden="true">
                  <i style={{ width: `${Math.max(1, Math.round(row.share * 100))}%` }} />
                </span>
                <span className="mono folder-share">
                  {Math.round(row.share * 100)}%
                </span>
                <span className="mono folder-files">
                  {row.files > 1 ? `${row.files} f.` : ""}
                </span>
              </button>
            ))}
            {content.hidden > 0 ? (
              <p className="muted tiny card-note">
                {`${content.hidden} hijos más, fuera de la lista.`}
              </p>
            ) : null}
            <p className="muted tiny card-note">
              Mismo orden que el mapa: de más área a menos. Pulsa un hijo para
              seleccionarlo.
            </p>
          </div>
        </CollapsibleSection>
      ) : (
        <p className="muted small">
          La carpeta está vacía en este snapshot: no se dibuja en el mapa.
        </p>
      )}
    </section>
  );
}

/** La hoja de carpeta sin selección: qué hacer y de dónde sale el mapa. */
function EmptyFolder({ model }: { model: RenderModel | null }) {
  return (
    <section className="inspector-empty">
      <h2>Selecciona una carpeta</h2>
      <p className="muted small">
        Un clic en una carpeta del mapa —o en la ruta del escenario— la
        selecciona sin mover el zoom, y esta hoja cuenta sus ficheros y su
        contenido. Con doble clic entras en ella.
      </p>
      {model ? (
        <div className="inspector-note">
          <span className="mono">{model.folderCount} carpetas</span>
          <span>{model.fileCount} ficheros</span>
        </div>
      ) : null}
    </section>
  );
}

/** Una fila de la frontera: el fichero de fuera y cuántas aristas lo atan. */
function BoundaryRow({
  file,
  onSelectPath
}: {
  file: BoundaryFile;
  onSelectPath: (path: string) => void;
}) {
  return (
    <button
      type="button"
      className="dependency-row"
      title={`${file.path} · ${file.edges} ${
        file.edges === 1 ? "arista" : "aristas"
      }`}
      onClick={() => onSelectPath(file.path)}
    >
      <span className="mono dependency-path">{file.path}</span>
      <span className="mono symbol-group-count">{file.edges}</span>
    </button>
  );
}
