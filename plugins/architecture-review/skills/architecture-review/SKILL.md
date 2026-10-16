---
name: architecture-review
description: Use when reviewing a change for dependency direction, module boundaries, coupling, and maintainability risks. Defines the review protocol — which rule packs to apply, how to classify findings, and how to report them with evidence.
---

# Architecture review

## Protocol

1. **Scope.** Get the diff (`git diff HEAD`, a branch against its merge base, or named files). No diff and no files → ask. Stay read-only.
2. **Learn the existing boundaries first.** Read the project's conventions files and the structure around the changed code. Judge the change against the architecture the project has, not against an ideal one. Do not propose reshaping the folder tree.
3. **Pick the rule packs by what the code is:**
   - backend code → `onion-architecture` (dependency rule, ports and adapters, module boundaries, testing strategy)
   - frontend code → `ui-architecture` (colocation, promotion to shared, one-directional dependencies)
   - a diff touching both → both packs, in one pass
   - neither pack applies (docs, CI, config) → say so in one line and stop
4. **Check against the pack's concrete checklist** (for backend, `rules/anti-patterns.md`). Do not invent criteria beyond the packs and the project's own documented rules.
5. **Classify each finding:**
   - `CONFIRMED` — the violation is visible in the diff, with the offending `file:line` and the import or call that proves it
   - `PLAUSIBLE` — a concern that depends on code you could not see or run; say what would confirm it
6. **Report** only actionable findings: severity, `file:line` evidence, the failure mode (what concretely breaks or becomes untestable), and the smallest safe remediation. Say what you could not verify.

## Discipline

- Precision over volume. An empty list is a valid, good result.
- Never duplicate a finding across files; group by root cause and cite the lines.
- Severity is about impact, not taste. A style preference is not a boundary violation.
- Explain the "why" (swapping a provider forces edits in business logic; the test needs a real database) rather than citing the pattern name.
- Report gaps; do not fix them. Fixes belong to an implementer working from your findings.

## Related components

- `architecture-reviewer` agent — runs this protocol read-only and returns findings through `ReportFindings`.
- `pr-self-review` skill — manual dispatcher that applies this protocol to the current diff.
