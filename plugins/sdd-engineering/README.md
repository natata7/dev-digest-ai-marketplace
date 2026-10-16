# SDD Engineering

Specification-driven development workflows that connect requirements, implementation, tests, verification, and a workflow retrospective.

## Workflow

1. `spec-creator` turns a request into observable acceptance criteria.
2. `implementation-planner` maps the approved specification to bounded steps.
3. `implementer` executes one step at a time and reports validation evidence.
4. `plan-verifier` checks coverage against every requirement.
5. `run` captures a concise retrospective for the next iteration.

## Components

- `agents/spec-creator.md` — creates implementation-ready specifications.
- `agents/implementation-planner.md` — creates an ordered plan with ownership and verification.
- `agents/implementer.md` — executes one bounded plan step.
- `agents/plan-verifier.md` — produces a requirement-to-evidence coverage matrix.
- `skills/specification-driven-development/SKILL.md` — turns an agreed requirement into an implementation and verification loop.
- `skills/run/SKILL.md` — runs a workflow retrospective after delivery.

## Composition

SDD Engineering is independently installable. It can consume findings from Research Tools and Architecture Review and follows the shared discovery and validation conventions from Engineering Paved Path. These are documented workflow hand-offs, not automatic installation dependencies.

See the repository's [plugin ecosystem specification](../../docs/PLUGIN-ECOSYSTEM-SPEC.md) for the dependency graph and public path rules.

Release conventions are documented in [RELEASES.md](RELEASES.md).

## Install

```text
/plugin marketplace add natata7/dev-digest-ai-marketplace
/plugin install sdd-engineering@dev-digest-ai-marketplace
```
