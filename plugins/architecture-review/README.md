# Architecture Review

Review workflows for dependency direction, module boundaries, and maintainability risks.

## When to use it

Use this plugin before implementation for a design review, or after implementation to find confirmed architectural violations and avoidable coupling.

## Components

- `agents/architecture-reviewer.md` — reviews a change and reports evidence-backed findings.
- `skills/architecture-review/SKILL.md` — reusable review criteria and reporting rules.

## Composition

Architecture Review is independently installable and explicitly composes Engineering Paved Path for repository discovery, focused changes, and validation. It can provide findings to SDD Engineering's Implementer and Plan Verifier.

## Install

```text
/plugin marketplace add natata7/dev-digest-ai-marketplace
/plugin install architecture-review@dev-digest-ai-marketplace
```
