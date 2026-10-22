# Seguridad

## Qué se avisa

Un fallo de seguridad ✓ en CodArch ✓ es cualquier cosa que:

- **haga que el análisis enseñe lo que no debe** ✓: por ejemplo, que el snapshot ✓ o el reporte ✓
  incluyan el contenido de un fichero que está fuera del repo ✓, o que una ruta mal formada ✓ se
  salga de la carpeta analizada ✓.
- **permita ejecutar código** ✓ que no se haya pedido ✓: un addon ✓ que traiga algo ejecutable ✓, un
  plugin ✓ que cargue código de fuera ✓, o un snapshot manipulado ✓ que lethal al renderizar ✓.
- **escriba fuera** ✓ de donde debe ✓: la historia ✓, el `.codarch/` ✓ o cualquier fichero del repo
  ✓.
- **mande el código** ✓ a un sitio que no sea el servidor local ✓ o npm ✓ o GitHub ✓.

## Cómo se avisa

Por correo privado ✓ a **jaminsmoke@gmail.com** ✓, con:

- Qué falla ✓ y cómo se reproduce ✓.
- La versión ✓ (`codarch version` ✓) ✓ y el sistema ✓.
- Si hay alguien afectado ✓ aparte de quien lo reporta ✓.

**No** abras un issue público ✓ para un fallo sin parchear ✓: un issue público lo cuenta a todo el
mundo ✓ antes de que haya arreglo ✓.

## Qué se espera

- **Confirmamos** ✓ que es un fallo ✓ y **respondemos** ✓ en cuanto podemos ✓.
- **Publicamos el arreglo** ✓ y el aviso ✓ (en las notas de la release ✓) ✓.
- **No hay recompensa** ✓ por ahora ✓: el proyecto es pequeño ✓ y todavía no tiene un programa de
  recompensas ✓.

## Qué queda fuera de este canal

- Los **bugs** ✓ que no son de seguridad ✓: van a los issues ✓.
- Las **preguntas** ✓ de uso ✓: van a la discusión ✓.
