import { useCallback, useEffect, useState } from "react";

/* eslint-disable jsx-a11y/no-static-element-interactions, jsx-a11y/no-noninteractive-element-interactions -- el fondo del diálogo cierra con ratón; el teclado ya tiene Escape y el botón Cerrar */

interface BrowseEntry {
  name: string;
  path: string;
  kind: "directory";
}

interface BrowseResult {
  path: string;
  parent: string | null;
  entries: BrowseEntry[];
}

interface FolderPickerProps {
  open: boolean;
  initialPath: string;
  onClose: () => void;
  onSelect: (path: string) => Promise<void>;
}

export default function FolderPicker({
  open,
  initialPath,
  onClose,
  onSelect
}: FolderPickerProps) {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [typedPath, setTypedPath] = useState(initialPath);
  const [data, setData] = useState<BrowseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (pathValue: string) => {
    setLoading(true);
    setError(null);
    try {
      const query = pathValue.trim()
        ? `?path=${encodeURIComponent(pathValue.trim())}`
        : "";
      const response = await fetch(`/api/browse${query}`);
      const body = (await response.json()) as BrowseResult & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "no se pudo leer la carpeta");
      setData(body);
      setCurrentPath(body.path);
      setTypedPath(body.path);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect -- al abrir, la carpeta inicial manda sobre lo que hubiera */
  useEffect(() => {
    if (!open) return;
    setCurrentPath(initialPath);
    setTypedPath(initialPath);
    void load(initialPath);
  }, [open, initialPath, load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const choose = async (): Promise<void> => {
    const target = data?.path ?? currentPath;
    if (!target) return;
    setBusy(true);
    setError(null);
    try {
      await onSelect(target);
    } catch (cause) {
      setError((cause as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="modal folder-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Elegir carpeta para monitorizar"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="eyebrow">Servidor local</div>
        <h2>Elegir repositorio</h2>
        <p className="muted small">
          El servidor analiza la carpeta y activa <b>live</b> al seleccionarla. No se
          escribe nada en el repositorio.
        </p>

        <div className="folder-path">
          <button
            type="button"
            className="folder-up"
            disabled={!data?.parent || loading}
            onClick={() => data?.parent && void load(data.parent)}
            title="Subir una carpeta"
          >
            ↑
          </button>
          <input
            type="text"
            value={typedPath}
            spellCheck={false}
            onChange={(event) => setTypedPath(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void load(typedPath);
            }}
            aria-label="Ruta de la carpeta"
          />
          <button
            type="button"
            className="button ghost small"
            disabled={loading}
            onClick={() => void load(typedPath)}
          >
            Ir
          </button>
        </div>

        {error ? <p className="pr-error">{error}</p> : null}

        <div className="folder-list" aria-busy={loading}>
          {loading ? <div className="folder-empty">Leyendo carpeta…</div> : null}
          {!loading && data?.entries.length === 0 ? (
            <div className="folder-empty">No hay subcarpetas.</div>
          ) : null}
          {!loading
            ? data?.entries.map((entry) => (
                <button
                  key={entry.path}
                  type="button"
                  className="folder-entry"
                  onClick={() => void load(entry.path)}
                  title={entry.path}
                >
                  <span className="folder-icon">▸</span>
                  <span className="folder-name">{entry.name}</span>
                </button>
              ))
            : null}
        </div>

        <div className="folder-footer">
          <span className="mono folder-current" title={data?.path ?? currentPath}>
            {data?.path ?? currentPath}
          </span>
          <div className="folder-actions">
            <button type="button" className="button ghost dark-text" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="button"
              className="button dark"
              disabled={busy || loading || !data}
              onClick={() => void choose()}
            >
              {busy ? "Analizando…" : "Monitorizar esta carpeta"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
