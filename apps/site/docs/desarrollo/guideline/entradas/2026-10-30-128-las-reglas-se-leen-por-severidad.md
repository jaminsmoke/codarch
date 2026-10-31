---
title: "Las reglas se leen por severidad"
date: "2026-10-30"
category: "feature"
verdict: "arreglo"
---

**Qué era**: la sección **Reglas** del proyecto contaba lo correcto y lo leía mal. Los sistemas, su configuración, su estado y sus reglas activas iban en mono de 9 px con casi la misma tinta: `eslint`, `eslint.config.js`, `medido` y `24 reglas activas` se leían como cuatro líneas iguales. La tabla de hallazgos no tenía cabecera, un cero dejaba una celda vacía y el error y el aviso compartían el gris, así que doce reglas eran doce renglones indistinguibles. Un `info` se escribía `1 info`, que no dice cuántos son.

**Qué cambia**: cada sistema es una ficha con su filete —verde si midió—, el nombre en sans a 11,5 px y 600, su config en mono, la píldora de **medido** o **sin medir** y una barra de severidades con el ancho de cada cuenta. Al desplegar sus reglas activas, cada una lleva el punto de su severidad y su palabra en la tinta que le toca. Los hallazgos van en tabla: cabecera **Regla · Err. · Avis. · Info** compartiendo rejilla con las filas, los ceros como raya y cada número en el rojo de la deuda, el ocre del aviso y el azul del `info` —los mismos colores que una violación de lint en **Cambios**—. El identificador de la regla sube a tinta plena; la cuenta es lo que se mira.

**Por qué así**: en 286 px de hoja no se arregla subiendo todo el tamaño. Se arregla con jerarquía —peso y familia— y con color con significado: la severidad ya tenía colores en la app y aquí no se usaban. Reutilizarlos hace que un error se vea como un error en las dos pestañas, sin una leyenda nueva.

**Verificado**: tests de la presentación —cabecera de columnas, rayas del cero, píldora del sistema medido, barra y puntos de severidad—, más los existentes de contadores y ámbitos; typecheck y suite en verde.

**Veredicto**: arreglo.
