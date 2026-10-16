# Architecture Review

Review workflows for dependency direction, module boundaries, and maintainability risks, with full rule packs for backend and frontend code.

## When to use it

Use this plugin before implementation for a design review, or after implementation to find confirmed architectural violations and avoidable coupling.

## Components

- `agents/architecture-reviewer.md` — read-only reviewer; classifies paths, applies the right rule packs and reports evidence-backed findings (`ReportFindings` when available).
- `skills/architecture-review/SKILL.md` — the review protocol: scope, pack selection, `CONFIRMED` vs `PLAUSIBLE`, reporting rules.
- `skills/onion-architecture/` — backend rule pack: the dependency rule, ports and adapters, module boundaries, dependency injection, testing strategy, anti-pattern checklist, optional lint enforcement.
- `skills/ui-architecture/` — frontend rule pack: colocation vs promotion, constants vs utils vs helpers, where business logic lives, one-directional shared code, barrel files.
- `skills/pr-self-review/SKILL.md` — manual dispatcher that loads the right packs for the current diff (frontend, backend, or both).

## Composition

Architecture Review is independently installable and explicitly composes Engineering Paved Path for repository discovery, focused changes, and validation. It can provide findings to SDD Engineering's `/implement` (its review and fix loop) and Plan Verifier. The `ui-architecture` pack points to `react-best-practices` and `next-best-practices`, which ship in the TypeScript Fullstack Skills plugin; neither is required.

## Install

```text
/plugin marketplace add natata7/dev-digest-ai-marketplace
/plugin install architecture-review@dev-digest-ai-marketplace
```
