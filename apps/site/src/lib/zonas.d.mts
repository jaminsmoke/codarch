export declare const ZONAS: readonly ["usar", "desarrollo"];
export declare const GUIA: string;
export declare function idDocumento(relativa: string): string;
export declare function rutaWeb(clave: string): string;
export declare function zonaDeRuta(ruta: string): "usar" | "desarrollo" | null;
export declare function esRutaInterna(ruta: string): boolean;

export declare const ETIQUETAS_ZONA: Record<"es" | "en", Record<(typeof ZONAS)[number], string>>;
export declare function etiquetaZona(ruta: string): string | null;
export declare function filtrosBusqueda(ruta: string): Record<string, string[]>;
