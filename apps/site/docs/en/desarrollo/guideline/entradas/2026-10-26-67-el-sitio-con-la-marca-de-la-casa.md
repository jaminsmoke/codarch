---
title: The site, with the house mark
date: "2026-10-26"
category: fix
verdict: arreglo
---

**What it was**: the site had a blue of its own —cobalt `#2f6fed`— as its brand colour: the links, the homepage's accent, the small-caps labels and the active pill in the docs header. It is not the app's colour, whose mark is ink and rust, and on top of that it did not reach the contrast it needed: 4.01:1 on the paper, where AA asks for 4.5, and 3.63:1 on its own tint. The `theme-color` painted the browser bar with that blue, which appeared nowhere else in the chrome. And hovering a link in the docs header turned its text white on grey 6: 1.14:1, invisible.

**What changed**: the site's accent is the house's, with two values like the app's diff. `--color-rust` (`#d95d39`) for the masses —a quote's rule, the intro's background, the day number in the guide, the focus ring— and `--color-rust-ink` (`#a83a1e`) for small text. In dark, `#f08a6c`, which works for both text and stroke. Starlight's tokens —`accent`, `accent-low`, `accent-high` and `text-accent`— come from those two, so the homepage, the guide and the documents stop changing accent when you change page. The `theme-color` is now the paper's (`#eef1f2`) and the dark background's (`#10161b`), in two tags with `prefers-color-scheme`, emitted by a component, `components/Tema.astro`, that both layouts of the site share.

**Numbers**: links go from 4.01:1 to 5.62:1 on the paper; the active pill, from 3.63:1 to 5.08:1 on `accent-low`; the header's link, from 1.14:1 to 15.49:1. Measured with WCAG's contrast formula over the token values, before and after. Blue stays only where it is a category —the guide's «ADR» and «Novedades» labels—, which is a legend and not the mark.

**The legend**: the guide's categories and verdicts are set in 9 px small caps and carry a colour of their own. The pure tone did not clear it —ochre sat at 2.76:1 on its chip—, so each family has two values like the accent: `color` for the dot and the border, `ink` for the letter. The reading ones run from 4.76:1 to 7.35:1 on paper and panel, and in dark they are the same light tones. The secondary grey (`--color-muted`) went one step down, from `#64727b` to `#55626a`, because the old tone sat at 4.37:1. `paleta.test.ts` resolves `styles.css`'s tokens and measures every label in both themes: with the old ochre, it fails.

**Verdict**: a fix, with no phase and no ADR. The site has no themes of its own: it follows the system's with `prefers-color-scheme`, and its tokens live in `apps/site/src/styles.css` and `apps/site/src/styles/starlight.css`. When Ajustes › General picks a theme (entry 64, ADR 0082), these are the values to move, not to copy.
