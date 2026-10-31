import type { RenderFile } from "@codarch/render/browser";
import type { CcMigrationNode } from "@codarch/schema/browser";
import { splitFileName } from "../fileName";
import { STATUS_COLOR, STATUS_LABEL } from "../labels";

/** La cabecera: la ruta, el nombre partido y el estado de migración. */
export function FileHeader({
  file,
  migrationNode
}: {
  file: RenderFile;
  migrationNode: CcMigrationNode | null;
}) {
  const name = splitFileName(file.name);

  return (
    <>
      <div className="inspector-path" title={file.path}>
        {file.path}
      </div>
      <h2>
        {name.base}
        {name.ext ? (
          <>
            <wbr />
            {name.ext}
          </>
        ) : null}
      </h2>

      {migrationNode ? (
        <div className="inspector-status">
          <span
            className="status-dot"
            style={{ background: STATUS_COLOR[migrationNode.status] }}
          />
          <span>{STATUS_LABEL[migrationNode.status]}</span>
          <span className="mono">{migrationNode.language}</span>
        </div>
      ) : null}
    </>
  );
}
