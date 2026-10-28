import { useCallback, useState } from "react";
import { OpenMenu } from "@codarch/ui";

interface WebTopbarProps {
  /** Sin servidor local delante no hay carpetas que vigilar. */
  liveDisabled: boolean;
  onLiveFolder: () => void;
  onPickRepository: () => void;
  onAnalyzeFolder: () => void;
  onPickCcJson: () => void;
  /** Carga un snapshot (y su reporte, si lo hay) desde una URL. */
  onLoadUrl: (snapshotUrl: string, reportUrl: string) => Promise<void>;
  /** Copia el enlace de la vista; dice si lo consiguió. */
  onCopyLink: () => Promise<boolean>;
  menuRef: React.RefObject<HTMLDetailsElement | null>;
}

/** Lo que tarda el aviso de «enlace copiado» en apagarse. */
const COPIED_MS = 1800;

/**
 * La barra de la web: el menú de abrir y la carga por URL.
 *
 * Lo que decide qué se carga no vive aquí: esta pieza solo recoge lo que el
 * usuario escribe y lo pasa a la app. Su estado es lo que se teclea en las dos
 * cajas y el aviso de «enlace copiado», que se apaga solo.
 */
export default function WebTopbar({
  liveDisabled,
  onLiveFolder,
  onPickRepository,
  onAnalyzeFolder,
  onPickCcJson,
  onLoadUrl,
  onCopyLink,
  menuRef
}: WebTopbarProps) {
  const [urlInput, setUrlInput] = useState("");
  const [reportUrlInput, setReportUrlInput] = useState("");
  const [copied, setCopied] = useState(false);

  const copyLink = useCallback(async () => {
    if (!(await onCopyLink())) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), COPIED_MS);
  }, [onCopyLink]);

  const loadUrl = useCallback(
    () => onLoadUrl(urlInput, reportUrlInput),
    [onLoadUrl, urlInput, reportUrlInput]
  );

  return (
    <OpenMenu
      ref={menuRef}
      items={[
        {
          label: "Monitorizar carpeta (live)…",
          onClick: onLiveFolder,
          disabled: liveDisabled,
          title: liveDisabled
            ? "Arranca `codarch serve` para elegir carpetas locales"
            : "Analiza y vigila una carpeta local"
        },
        {
          label: "Carpeta con .codarch…",
          onClick: onPickRepository
        },
        {
          label: "Analizar carpeta aquí…",
          onClick: onAnalyzeFolder,
          title: "Analiza la carpeta en el navegador, sin ejecutar el CLI"
        },
        {
          label: "Archivo cc.json…",
          onClick: onPickCcJson
        },
        {
          label: copied ? "Enlace copiado" : "Copiar enlace de la vista",
          onClick: () => void copyLink(),
          keepOpen: true,
          title:
            "Copia el enlace de la vista actual (área, color, carpeta y fichero)"
        }
      ]}
    >
      <div className="url-load">
        <label className="field">
          <span>Snapshot por URL</span>
          <input
            type="text"
            value={urlInput}
            placeholder="https://…/snapshot.cc.json"
            onChange={(event) => setUrlInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void loadUrl();
            }}
          />
        </label>
        <label className="field">
          <span>Reporte por URL (opcional)</span>
          <input
            type="text"
            value={reportUrlInput}
            placeholder="https://…/report.json"
            onChange={(event) => setReportUrlInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void loadUrl();
            }}
          />
        </label>
        <button
          type="button"
          onClick={() => void loadUrl()}
          disabled={!urlInput.trim()}
        >
          Cargar por URL
        </button>
      </div>
      <p>
        Monitorizar analiza una carpeta en el servidor local. .codarch carga
        artefactos ya generados. Para activarlo: <code>codarch serve</code>.
      </p>
    </OpenMenu>
  );
}
