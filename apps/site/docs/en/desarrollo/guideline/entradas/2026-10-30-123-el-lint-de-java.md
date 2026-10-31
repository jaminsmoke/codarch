---
title: "Java's lint"
date: "2026-10-30"
category: "feature"
verdict: "fase"
---

**What it was**: Checkstyle was detected from its XML or from the Gradle plugin, entered the artifact with a "no reader yet" and measured nothing: Java was the only supported language with no lint on the map.

**What changes**: `checkstyle -c <config> -f xml .` runs with the `checkstyle` on the PATH and its XML is read, with file, line, column, severity and the class that produces the finding. The rule keeps the class name without the `Check` —`EmptyStatementCheck` is `EmptyStatement`, as the config declares it— and `ignore` does not enter. Its active rules come from the XML's `<module name="…">` entries, without containers (`Checker`, `TreeWalker`) or suppression filters, which measure nothing; severity is not read from the module, because its config does not put it there, and it says so. If all there is is the Gradle plugin and the XML it uses is unknown, the path is not invented: the system is declared and not measured.

**Why this way**: the XML is the output its CLI has always given; SARIF depends on the version. And the XML is not interpreted by hand beyond its attributes: there are no rules or severities to take from anywhere else.

**Verified**: tests for the reader with files, entities, severities and `ignore` left out; for the modules with containers and filters; for detection with XML and with the Gradle plugin, and for dispatching in `runLint`. Plus a real `codarch lint` run on a test repo with a stub binary: three active modules and two findings —one error and one warning— with line and column in `lint.cc.json`. Full suite (1,267), lint, typecheck and site build green.

**What is missing**: the readers for `go vet` and the .NET analysers, the last two systems without a measurement.

**Verdict**: phase in progress.
