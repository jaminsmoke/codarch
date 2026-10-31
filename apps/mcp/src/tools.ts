// Las herramientas del MCP, una por asunto. Este fichero es la superficie:
// el servidor y las pruebas importan de aquí y no necesitan saber en qué
// módulo vive cada una. Los ayudantes internos —`helpers` y `scope`— no
// salen: no son herramientas.

export * from "./tools/types";
export * from "./tools/map";
export * from "./tools/migration";
export * from "./tools/duplication";
export * from "./tools/history";
export * from "./tools/config";
export * from "./tools/symbols";
export * from "./tools/analysis";
export * from "./tools/lint";
export * from "./tools/shot";
