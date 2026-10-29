import * as Dialog from "@radix-ui/react-dialog";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { RenderModel } from "@codarch/render/browser";
import type { PluginDescriptor } from "@codarch/plugin-api";
import type { RepoAddon } from "@codarch/addons";
import type { Tema } from "./theme";
import {
  AddonsSection,
  ComponentsSection,
  DiagnosticsSection,
  GeneralSection,
  PluginsSection,
  ProjectSection,
  UpdatesSection,
  ViewSection
} from "./settings/sections";

/**
 * Los ajustes: un sitio donde se configura y se mira todo.
 *
 * Es un diálogo con secciones (ADR 0027 ✓). Lo que se ajusta se guarda donde
 * ya estaba ✓: los ajustes no inventan un sitio nuevo para lo que ya tenía
 * sitio ✓.
 *
 * Este módulo es el armazón: el diálogo, la lista de secciones y el estado de
 * la sesión. Lo que hay dentro de cada sección vive en `settings/sections`, y
 * cada una recibe solo lo que enseña.
 */

export interface SettingsColorOption {
  value: string;
  label: string;
}

/** Lo que se sabe de una actualización, venga de npm o de las releases. */
export interface SettingsUpdateInfo {
  current: string;
  latest: string | null;
  outdated: boolean;
  error: string | null;
  url: string | null;
  /** Si la app puede instalarse aquí mismo la versión nueva (escritorio). */
  canInstall?: boolean;
}

/**
 * De dónde sale una actualización y cómo se cuenta.
 *
 * La fuente es de la app ✓: npm en la web, el proceso principal en el
 * escritorio ✓. La UI comparte la sección y deja aquí lo que cambia ✓.
 */
export interface SettingsUpdateAdapter {
  /** Comprueba si hay una versión más nueva que `current`. */
  check(current: string): Promise<SettingsUpdateInfo>;
  /** Lo que se ofrece cuando hay una versión nueva. */
  action(update: SettingsUpdateInfo): ReactNode;
  /** La nota al pie de la sección. */
  note: ReactNode;
}

/** Una pieza versionada, para la sección Componentes (ADR 0065). */
export interface SettingsComponent {
  name: string;
  version: string;
  /** Cómo se actualiza y quién la reinicia. */
  detail: string;
}

export interface SettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** El tema de la app: claro, oscuro o el del sistema (ADR 0084). */
  tema: Tema;
  onTema: (tema: Tema) => void;
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
  /** Dónde vive el proyecto guardado; por defecto, este navegador. */
  projectNote?: ReactNode;
  /** Si el almacenamiento local está disponible. */
  storageAvailable: boolean;
  /** La vigilancia del servidor local, cuando la plataforma la ofrece. */
  watch?: {
    state: "live" | "paused";
    onToggle: () => void;
  };
  /** La versión de CodArch que está corriendo. */
  version: string;
  /** Las piezas versionadas y cómo se actualizan (ADR 0065). */
  components: readonly SettingsComponent[];
  /** De dónde se comprueba la actualización de la app. */
  updates: SettingsUpdateAdapter;
  /** Si la plataforma tiene WebGL2, para los requisitos de un plugin. */
  webgl2: boolean;
  /** Si la plataforma tiene WebGPU: el runtime que se prefiere ✓. */
  webgpu: boolean;
  /** Los plugins que el repo declara compilados. */
  plugins: readonly PluginDescriptor[];
  /** Los plugins activados en esta máquina. */
  enabledPlugins: readonly string[];
  onTogglePlugin: (name: string, on: boolean) => void;
  /** Los plugins que no se pudieron cargar. */
  failedPlugins: readonly string[];
  /**
   * Los addons que declara el proyecto (ADR 0029).
   *
   * Solo se miran: no se activan ni se desactivan como los plugins, porque
   * viajan con el repo y el análisis no cambia por tenerlos.
   */
  addons: readonly RepoAddon[];
  /** Si los bloques del mapa muestran su nombre aunque no quepa entero. */
  showLabels: boolean;
  onShowLabels: (value: boolean) => void;
}

type Section =
  | "general"
  | "vista"
  | "proyecto"
  | "plugins"
  | "addons"
  | "actualizaciones"
  | "componentes"
  | "diagnostico";

const SECTIONS: Array<{ id: Section; label: string }> = [
  { id: "general", label: "General" },
  { id: "vista", label: "Vista" },
  { id: "proyecto", label: "Proyecto" },
  { id: "plugins", label: "Plugins" },
  { id: "addons", label: "Addons" },
  { id: "actualizaciones", label: "Actualizaciones" },
  { id: "componentes", label: "Componentes" },
  { id: "diagnostico", label: "Diagnóstico" }
];

export default function Settings({
  open,
  onOpenChange,
  tema,
  onTema,
  areaMetric,
  onAreaMetric,
  colorMode,
  onColorMode,
  areaOptions,
  colorOptions,
  model,
  savedProject,
  onClearProject,
  projectNote,
  storageAvailable,
  watch,
  version,
  components,
  updates,
  webgl2,
  webgpu,
  plugins,
  enabledPlugins,
  onTogglePlugin,
  failedPlugins,
  addons,
  showLabels,
  onShowLabels
}: SettingsProps) {
  const [section, setSection] = useState<Section>("general");
  const [update, setUpdate] = useState<SettingsUpdateInfo | null>(null);
  const [checking, setChecking] = useState(false);

  /**
   * Pregunta a la fuente de la app si hay una versión más nueva (ADR 0032).
   *
   * La UI no sabe si la fuente es npm o una release de GitHub: lo decide la
   * app al inyectar el adaptador.
   */
  const checkUpdates = useCallback(async (): Promise<void> => {
    setChecking(true);
    try {
      setUpdate(await updates.check(version));
    } catch (error) {
      setUpdate({
        current: version,
        latest: null,
        outdated: false,
        error: error instanceof Error ? error.message : String(error),
        url: null
      });
    } finally {
      setChecking(false);
    }
  }, [updates, version]);

  // Se comprueba al abrir la sección, no antes: sin red por sorpresa.
  useEffect(() => {
    if (open && section === "actualizaciones" && !update && !checking) {
      // Es una comprobación externa (red) al abrir la sección, no estado derivado.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- comprobación externa al abrir
      void checkUpdates();
    }
  }, [open, section, update, checking, checkUpdates]);

  // Una sección, un componente: la lista de arriba y el contenido salen del
  // mismo sitio, así que añadir una sección no toca este render.
  const content: Record<Section, ReactNode> = {
    general: <GeneralSection tema={tema} onTema={onTema} />,
    vista: (
      <ViewSection
        areaMetric={areaMetric}
        onAreaMetric={onAreaMetric}
        colorMode={colorMode}
        onColorMode={onColorMode}
        areaOptions={areaOptions}
        colorOptions={colorOptions}
        showLabels={showLabels}
        onShowLabels={onShowLabels}
      />
    ),
    proyecto: (
      <ProjectSection
        savedProject={savedProject}
        onClearProject={onClearProject}
        projectNote={projectNote}
      />
    ),
    plugins: (
      <PluginsSection
        plugins={plugins}
        enabledPlugins={enabledPlugins}
        onTogglePlugin={onTogglePlugin}
        failedPlugins={failedPlugins}
        webgl2={webgl2}
        webgpu={webgpu}
      />
    ),
    addons: <AddonsSection addons={addons} />,
    actualizaciones: (
      <UpdatesSection
        version={version}
        update={update}
        checking={checking}
        onCheck={() => void checkUpdates()}
        updates={updates}
      />
    ),
    componentes: <ComponentsSection components={components} />,
    diagnostico: (
      <DiagnosticsSection
        version={version}
        model={model}
        storageAvailable={storageAvailable}
        watch={watch}
      />
    )
  };

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

            <div className="settings-content">{content[section]}</div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
