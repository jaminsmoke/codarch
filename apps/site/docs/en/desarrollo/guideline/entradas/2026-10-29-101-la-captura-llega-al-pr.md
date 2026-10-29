---
title: "The capture reaches the PR"
date: "2026-10-29"
category: "feature"
verdict: "fase"
---

**What it was**: the action commented the diff as text and uploaded the artifact with the snapshots, the published app and the report, but not the map. To see it you had to download the artifact, open `head/app/index.html` and wait for the web app to load; the comment, which is what people read, said nothing about the bulk.

**What it is**: a "Capturar el mapa" step between the head analysis and the comment leaves `head/map.png` and its summary `head/map.json` inside the artifact folder, using `codarch shot --out`, which takes no slot. The comment ends with a «Mapa del head» block: the area, the colour, the scale, the five largest cells with their name and area, and a link to the run's artifacts.

**Why like this**: the image does not fit inside the comment. GitHub sanitises HTML, drops `data:` images and has no public API to attach a file to a comment, so only images with a URL get painted. The alternatives were an image service —an external dependency in an analysis that uses no network today— or a published branch —binaries in the repo from CI—. The artifact was already being uploaded and asks for no extra permission.

**The failure that breaks nothing**: the action installs the CLI from npm, and the version published the day this was written did not know how to capture yet. The step runs with `set +e`: if `shot` fails, whatever it left is cleaned up, a `::warning::` is printed and the comment is published without the block. As soon as the action's pin points at a version with `shot`, the map shows up on its own.

**How it is checked**: `npm run check:action` asserts that the step exists, that it writes `map.png` and `map.json` into the artifact, that it tolerates failure and that the comment receives the summary; and it renders the comment twice —with the capture and without it— to check that the block comes out with its numbers and the link, and that with no file —or with a broken JSON— the comment still comes out whole.

**Verdict**: phase M62 stays open. Painted labels inside the image remain, which asks for a bitmap font and its own decision.
