/**
 * Almacenamiento local de la máquina, compartido entre la web y el escritorio.
 *
 * Aquí viven los tipos y lo que se guarda igual en las dos apps: las
 * preferencias de vista, los plugins activados y la forma de un proyecto
 * guardado en `localStorage`. Cada app pone lo suyo —dónde guarda el proyecto,
 * la raíz del último repo, la migración del formato viejo— en su propio módulo.
 *
 * Las piezas están por oficio: `storage-local` abre el almacén y guarda sus
 * claves, `storage-preferences` las preferencias, `storage-plugins` los
 * plugins y `storage-project` el proyecto guardado. Este módulo solo reúne,
 * porque es la puerta que la web, el escritorio y el índice de la UI ya usan.
 */

export * from "./storage-local";
export * from "./storage-preferences";
export * from "./storage-plugins";
export * from "./storage-project";
