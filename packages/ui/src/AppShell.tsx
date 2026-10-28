import type { DragEvent, ReactNode } from "react";
import type { HistoryEntry } from "@codarch/schema/browser";
import type { CodarchApp } from "./useCodarchApp";
import { Topbar } from "./shell/Topbar";
import { ProjectBand } from "./shell/ProjectBand";
import { ToolDock } from "./shell/ToolDock";
import { StagePath, StageTabs } from "./shell/StagePath";
import { MapStage, StageFoot } from "./shell/MapStage";
import { InspectorDock } from "./shell/InspectorDock";

/**
 * El armazón de la app: cabecera, barra lateral, mapa, inspector y ajustes.
 *
 * La web y el escritorio pintan lo mismo; lo que cambia de una plataforma a
 * otra entra por los huecos (`topbarActions`, `banner`, `settings`…) en vez de
 * duplicar el marcado (ADR 0049).
 *
 * Cada región de la pantalla vive en `shell/` con el estado que le es propio
 * (el dock plegado, el inspector, la ruta, el menú de vistas); aquí solo se
 * colocan y se les pasa lo que llega de fuera.
 */
export interface AppShellProps {
  app: CodarchApp;
  /** Botones propios de la plataforma, antes del menú de vistas. */
  topbarActions?: ReactNode;
  /** Botones propios de la plataforma, después del menú de vistas. */
  topbarTrailing?: ReactNode;
  /** Un aviso entre la cabecera del escenario y las pestañas. */
  banner?: ReactNode;
  /** Algo encima del mapa: la pista de arrastrar un fichero. */
  overlay?: ReactNode;
  /** Cancelar el análisis en marcha; sin esto no se pinta el botón. */
  onCancelAnalysis?: () => void;
  /** Abrir una foto del historial, con la ruta que sepa cada plataforma. */
  onOpenHistory: (entry: HistoryEntry) => void;
  /** Cargar el reporte desde donde sepa cada plataforma. */
  onLoadReport: () => void;
  /** Los ajustes ya montados: llevan props propias de la plataforma. */
  settings: ReactNode;
  /** Clases extra para el contenedor (por ejemplo, mientras se arrastra). */
  className?: string;
  onDragOver?: (event: DragEvent<HTMLDivElement>) => void;
  onDragLeave?: () => void;
  onDrop?: (event: DragEvent<HTMLDivElement>) => void;
}

export function AppShell({
  app,
  topbarActions,
  topbarTrailing,
  banner,
  overlay,
  onCancelAnalysis,
  onOpenHistory,
  onLoadReport,
  settings,
  className,
  onDragOver,
  onDragLeave,
  onDrop
}: AppShellProps) {
  return (
    <div
      className={`app${className ? ` ${className}` : ""}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <Topbar app={app} actions={topbarActions} trailing={topbarTrailing} />

      <ProjectBand app={app} />

      <div className="shell">
        <ToolDock app={app} />

        <main className="stage">
          {banner}
          <StagePath app={app} />
          <StageTabs app={app} />
          <MapStage app={app} overlay={overlay} />
          <StageFoot app={app} onCancelAnalysis={onCancelAnalysis} />
        </main>

        <InspectorDock
          app={app}
          onOpenHistory={onOpenHistory}
          onLoadReport={onLoadReport}
        />
      </div>

      {settings}
    </div>
  );
}
