export declare const ZONES: readonly ["usar", "desarrollo"];
export declare const GUIDE: string;
export declare function documentId(relativa: string): string;
export declare function webPath(key: string): string;
export declare function zoneOfPath(path: string): "usar" | "desarrollo" | null;
export declare function isInternalPath(path: string): boolean;

export declare const ZONE_LABELS: Record<"es" | "en", Record<(typeof ZONES)[number], string>>;
export declare function zoneLabel(path: string): string | null;
export declare function searchFilters(path: string): Record<string, string[]>;
