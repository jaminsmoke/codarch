export declare const ZONES: readonly ["usar", "desarrollo"];
export declare const GUIDE: string;
export declare function documentId(relativa: string): string;
export declare function webPath(clave: string): string;
export declare function zoneOfPath(ruta: string): "usar" | "desarrollo" | null;
export declare function isInternalPath(ruta: string): boolean;

export declare const ZONE_LABELS: Record<"es" | "en", Record<(typeof ZONES)[number], string>>;
export declare function zoneLabel(ruta: string): string | null;
export declare function searchFilters(ruta: string): Record<string, string[]>;
