# Engineering Paved Path

Reusable engineering workflows and delivery guardrails for Claude Code. This is the shared foundation used by the other marketplace workflows.

## Components

- `skills/paved-path/SKILL.md` — discover conventions and do-not-touch areas, make a focused change with explicit file ownership, validate narrowly then once broadly, and report with evidence.
- `skills/engineering-insights/SKILL.md` — protocol for reading a module's `INSIGHTS.md` before work and appending a specific, reusable, non-obvious entry after it (Pattern / Mistake / Decision / Context / Open Questions).

## Composition

Research Tools, Architecture Review, and SDD Engineering remain independently installable but reuse these conventions (`/implement`, `test-writer` and `spec-creator` refer to `engineering-insights`). The relationship is documented composition, not an automatic install-time dependency.

## Install

```text
/plugin marketplace add natata7/dev-digest-ai-marketplace
/plugin install engineering-paved-path@dev-digest-ai-marketplace
```
