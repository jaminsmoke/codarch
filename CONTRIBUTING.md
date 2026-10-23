# Cómo contribuir

CodArch es un mapa de arquitectura: analiza un repositorio ✓, lo dibuja ✓ y lo enseña en el pull
request ✓, en el CI ✓ y en el agente ✓. El código es TypeScript ✓, el motor vive en
`packages/` ✓ y las apps son consumidores ✓.

Antes de escribir código, lee el [`AGENTS.md`](AGENTS.md) ✓: ahí están las reglas ✓.

## Lo que se espera

- **Una idea por commit** ✓, y el commit la explica ✓ (`feat:`, `fix:`, `docs:`, `chore:` ✓).
- **Tests primero o a la vez** ✓: cualquier cambio de comportamiento lleva su test ✓.
- **Determinismo** ✓: nada de marcas de tiempo ✓, rutas absolutas ✓ ni orden del sistema de
  ficheros ✓ en los snapshots ✓. El checksum depende del código ✓, no de lo que tengas instalado ✓.
- **Documentación en español** ✓, código ✓, nombres de API ✓ y tests ✓ en inglés técnico ✓.
- **Un cambio de modelo o de producto** ✓ lleva un **ADR** ✓ antes de codificar ✓
  ([`apps/site/docs/adr/`](apps/site/docs/adr/index.md) ✓).
- **Nada de artefactos** ✓: `node_modules/` ✓, `dist/` ✓, `.codarch/` ✓ y `samples/` ✓ están
  ignorados ✓ y no se commitean ✓.

## Antes de abrir un pull request

```bash
npm ci
npm run lint
npm run typecheck
npx vitest run
npm run check:action
npm run version       # las versiones del producto, el CLI y el escritorio: cuadran
```

Si tocas la acción ✓, también `npm run sync:action` ✓ y el repo público ✓.

## Cómo se decide

- Las **decisiones** ✓ van en un ADR ✓, con su contexto ✓, sus alternativas ✓ y sus
  consecuencias ✓.
- Las **fases** ✓ viven en la hoja de ruta de su decisión ✓ ([`apps/site/docs/adr/`](apps/site/docs/adr/index.md) ✓) ✓,
  y `apps/site/docs/adr/roadmap.md` ✓ solo las indexa ✓. Lo hecho queda en el **feed de la guía** ✓
  (`apps/site/docs/guideline/entradas/` ✓).
- Las **ideas** ✓ que todavía no son fase ✓ viven en la [guía](apps/site/docs/guideline/README.md) ✓, por
  orden cronológico ✓ y con su veredicto ✓.

## La licencia

El código va bajo **MIT** ✓ (el [`LICENSE`](LICENSE) ✓). Al contribuir ✓ aceptas esa licencia ✓. El
nombre «CodArch» ✓ y el logotipo ✓ **no** se conceden con ella ✓: mira el
[`TRADEMARK.md`](TRADEMARK.md) ✓.
