# ADR 0001 — Clean-room, con `cc.json` como frontera

**Estado:** aceptado · **Fecha:** 2026-10-20

## Contexto

CodeCharta (MaibornWolff, BSD-3-Clause) lleva nueve años resolviendo este problema. Su repositorio
está activo, su analizador está en Kotlin y su visor en Angular. Su formato `cc.json` 2.x separa
identidad (`files`) de señales (`lenses`), y es genuinamente bueno.

Partir del fork ahorra parsers, pero hereda arquitectura, decisiones de UI y rumbo.

## Decisión

Construimos un producto **clean-room**: sin código derivado de CodeCharta.

Sí adoptamos su formato como **frontera de interoperabilidad**:

- **Entrada:** `cc.json` 1.x y 2.x. Nos permite usar sus datos de ejemplo, sus repos de prueba y
  comparar resultados en igualdad de condiciones desde el día uno.
- **Salida:** `cc.json` 2.x cuando sea barato. No es un objetivo de la v1.
- **Validación:** su JSON Schema entra en nuestro CI como test de conformidad del importador.

## Consecuencias

- Hay que escribir los parsers. Es el coste real de esta decisión.
- Ganamos un corpus de validación y un benchmark contra un rival maduro, gratis.
- Podemos adoptar sus ideas de diseño (identidad estable, lentes aditivas) sin arrastrar su stack.
- Riesgo de deriva del formato: mitigado validando contra su schema en cada release.

## Alternativas descartadas

- **Fork del repositorio.** Hereda Angular y Kotlin, y nos ata a su roadmap. El ahorro inicial no
  compensa perder la capacidad de decidir.
- **Solo inspiración conceptual.** Máxima libertad, pero perdemos datos de prueba, comparación y
  una vía de migración para usuarios existentes.

## Nota legal

BSD-3-Clause permite el fork con atribución. No lo hacemos. Se acredita la inspiración en el README
y se mantiene compatibilidad de formato, que es lo que beneficia al usuario.
