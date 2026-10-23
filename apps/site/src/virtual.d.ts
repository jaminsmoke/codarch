/** Las claves de los documentos, que salen del build (`vite.config.ts`). */
declare module "virtual:docs-rutas" {
  const claves: string[];
  export default claves;
}

/** El markdown que se lee tal cual: la entradilla y las normas de la guía. */
declare module "*.md?raw" {
  const contenido: string;
  export default contenido;
}
