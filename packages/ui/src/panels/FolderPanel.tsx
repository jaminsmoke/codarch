import type { LintArtifact } from "@codarch/lint/browser";
import type { RenderModel, TreeNode } from "@codarch/render/browser";
import { CollapsibleSection } from "../CollapsibleSection";
import {
  childFolderNodes,
  childFolders,
  countFolders,
  folderContent,
  folderDepth
} from "../folder";
import { withinFolder } from "../lintRollup";
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
  onSelectPath,
  onSelectFolder
}: {
  folder: TreeNode | null;
  model: RenderModel | null;
  /** El lint del proyecto, para la deuda del subárbol (ADR 0094). */
  lint: LintArtifact | null;
  /** Selecciona un fichero del contenido. */
  onSelectPath: (path: string) => void;
  /** Selecciona una carpeta del contenido. */
  onSelectFolder: (path: string) => void;
}) {
  if (!folder) return <EmptyFolder model={model} />;

  const content = folderContent(folder);
  const files = folder.fileCount;
  const folders = childFolders(folder);
  const areaTitle = model?.areaTitle ?? "área";
  const subtree = model
    ? model.files.filter((file) => withinFolder(folder.path, file.path))
    : [];

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
          folderCount={countFolders(folder)}
          lint={lint}
          folder={folder.path}
          onSelectFolder={onSelectFolder}
        />
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
