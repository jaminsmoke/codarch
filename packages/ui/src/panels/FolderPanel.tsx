import type { RenderModel, TreeNode } from "@codarch/render/browser";
import { CollapsibleSection } from "../CollapsibleSection";
import { childFolders, folderContent, folderDepth } from "../folder";

/**
 * La ficha de una carpeta (ADR 0092).
 *
 * Lo que se puede decir de una carpeta sin inventar agregados: cuántos ficheros
 * tiene, a qué profundidad está y qué hay dentro, en el orden del treemap. Las
 * métricas con dueño, la frontera y los ciclos son las siguientes rebanadas de
 * la hoja de ruta del ADR; mientras tanto la ficha enseña la composición, que
 * es lo que en un fichero son los miembros.
 *
 * No lleva símbolos, miembros, código ni cadena: una carpeta no tiene cuerpo, y
 * para llegar a un símbolo se entra.
 */
export function FolderPanel({
  folder,
  model,
  onSelectPath,
  onSelectFolder
}: {
  folder: TreeNode;
  model: RenderModel | null;
  /** Selecciona un fichero del contenido. */
  onSelectPath: (path: string) => void;
  /** Selecciona una carpeta del contenido. */
  onSelectFolder: (path: string) => void;
}) {
  const content = folderContent(folder);
  const files = folder.fileCount;
  const folders = childFolders(folder);
  const areaTitle = model?.areaTitle ?? "área";

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

      {content.rows.length > 0 ? (
        <CollapsibleSection
          id="folder-content"
          title="Contenido"
          className="section-content"
          count={content.rows.length}
          summary={`${folders} carpetas · ${files} ficheros`}
        >
          <div className="folder-list" role="group" aria-label="Contenido de la carpeta">
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
                <span className="folder-name" title={row.name}>
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
