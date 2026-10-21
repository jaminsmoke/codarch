import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import type { RenderModel } from "@codarch/render/browser";

/**
 * Los ajustes: un sitio donde se configura y se mira todo.
 *
 * Es un diálogo con secciones (ADR 0027 ✓). Lo que se ajusta se guarda donde
 * ya estaba ✓: los ajustes no inventan un sitio nuevo para lo que ya tenía
 * sitio ✓.
 */

export interface SettingsColorOption {
  value: string;
  label: string;
}

export interface SettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** La métrica que decide el área del mapa. */
  areaMetric: string | null;
  onAreaMetric: (value: string) => void;
  /** El modo de color del mapa. */
  colorMode: string;
  onColorMode: (value: string) => void;
  /** Las métricas que se pueden usar como área. */
  areaOptions: Array<{ value: string; label: string }>;
  /** Los modos de color que hay. */
  colorOptions: SettingsColorOption[];
  /** El mapa que se está viendo, para el diagnóstico. */
  model: RenderModel | null;
  /** El proyecto guardado, si lo hay. */
  savedProject: { label: string } | null;
  onClearProject: () => void;
  /** Si el almacenamiento local está disponible. */
  storageAvailable: boolean;
  /** La versión de CodArch que está corriendo. */
  version: string;
}

type Section = "vista" | "proyecto" | "diagnostico";

const SECTIONS: Array<{ id: Section; label: string }> = [
  { id: "vista", label: "Vista" },
  { id: "proyecto", label: "Proyecto" },
  { id: "diagnostico", label: "Diagnóstico" }
];

export default function Settings({
  open,
  onOpenChange,
  areaMetric,
  onAreaMetric,
  colorMode,
  onColorMode,
  areaOptions,
  colorOptions,
  model,
  savedProject,
  onClearProject,
  storageAvailable,
  version
}: SettingsProps) {
  const [section, setSection] = useState<Section>("vista");

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="settings-overlay" />
        <Dialog.Content className="settings-panel">
          <div className="settings-head">
            <Dialog.Title className="settings-title">Ajustes</Dialog.Title>
            <Dialog.Close className="settings-close" aria-label="Cerrar">
              ✕
            </Dialog.Close>
          </div>

          <div className="settings-body">
            <nav className="settings-sections" aria-label="Secciones">
              {SECTIONS.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className={`settings-section${
                    section === entry.id ? " is-active" : ""
                  }`}
                  onClick={() => setSection(entry.id)}
                >
                  {entry.label}
                </button>
              ))}
            </nav>

            <div className="settings-content">
              {section === "vista" ? (
                <>
                  <label className="field">
                    <span>Área</span>
                    <select
                      value={areaMetric ?? ""}
                      onChange={(event) => onAreaMetric(event.target.value)}
                    >
                      {areaOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Color</span>
                    <select
                      value={colorMode}
                      onChange={(event) => onColorMode(event.target.value)}
                    >
                      {colorOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="muted small">
                    Son preferencias de esta máquina: el análisis del repositorio no cambia ✓.
                  </p>
                </>
              ) : null}

              {section === "proyecto" ? (
                <>
                  <div className="settings-row">
                    <span>Proyecto guardado</span>
                    <b>{savedProject ? savedProject.label : "ninguno"}</b>
                  </div>
                  <p className="muted small">
                    Se guarda en este navegador para que no tengas que elegirlo cada vez ✓.
                  </p>
                  <button
                    type="button"
                    className="button"
                    disabled={!savedProject}
                    onClick={onClearProject}
                  >
                    Olvidar el proyecto
                  </button>
                </>
              ) : null}

              {section === "diagnostico" ? (
                <>
                  <div className="settings-row">
                    <span>Versión</span>
                    <b className="mono">{version}</b>
                  </div>
                  <div className="settings-row">
                    <span>Formato del modelo</span>
                    <b className="mono">{model?.meta.apiVersion ?? "—"}</b>
                  </div>
                  <div className="settings-row">
                    <span>Checksum</span>
                    <b className="mono">
                      {model?.meta.checksum.slice(0, 12) || "—"}
                    </b>
                  </div>
                  <div className="settings-row">
                    <span>Almacenamiento local</span>
                    <b>{storageAvailable ? "disponible" : "no disponible"}</b>
                  </div>
                  <p className="muted small">
                    El checksum es la identidad del análisis: el mismo código da el mismo checksum ✓.
                  </p>
                </>
              ) : null}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
