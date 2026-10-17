# SDD Engineering

Specification-driven development workflows that connect requirements, implementation, tests, verification, documentation, and a workflow retrospective.

## Workflow

1. `spec-creator` turns a request (and any design or mockup) into observable EARS acceptance criteria, edge cases and open questions.
2. `implementation-planner` validates the spec against the code and maps it to bounded steps with files owned, skills and an execution mode. A human approves the plan.
3. `/sdd-engineering:implement <plan>` runs the plan: parallel `implementer` agents, then an architecture review and fix loop, then `plan-verifier`, then a spec-drift check.
4. `test-writer` writes tests derived from the acceptance criteria; `doc-writer` documents the confirmed implementation.
5. `run` captures a retrospective (cost, friction, duplication, proposals) for the next iteration.

## Components

- `agents/spec-creator.md` — writes specifications and design analyses; asks blocking questions first; Markdown under `docs/specs/**` or `specs/**` only.
- `agents/implementation-planner.md` — creates the Implementation Plan; writes only `NN-plan-*.md`.
- `agents/implementer.md` — executes one bounded plan step and reports evidence.
- `agents/plan-verifier.md` — produces a requirement-to-evidence Coverage Matrix.
- `agents/test-writer.md` — writes tests from requirements; edits test files only.
- `agents/doc-writer.md` — turns plans and validation reports into documentation; Markdown only.
- `commands/implement.md` — the orchestrator for a ready plan.
- `hooks/hooks.json` — registers two hooks: `path-guard.sh` (write guard for `spec-creator`, `implementation-planner` and `doc-writer`; self-check in `path-guard.test.sh`) and `trace-version.sh` (SessionStart).
- `skills/specification-driven-development/SKILL.md` — the loop and its principles.
- `skills/run/SKILL.md` — manual workflow retrospective with a ledger.

## Requirements and environment

- The write guard needs `jq` on `PATH`. If `jq` is missing the hook reports a non-blocking error and the agents' own instructions remain the only restriction.
- The guard applies only when the hook payload names the calling agent. Calls without an agent name (for example from the main session) are never blocked.
- The guard resolves paths against `$CLAUDE_PROJECT_DIR` (or the current directory).
- Optional: a design-tool MCP server (such as Figma) for design analysis, and a browser-automation MCP server (such as Playwright) for the UI gate in `/implement`.

## Trace of the active version

On every session start `trace-version.sh` appends one JSON line (`ts`, `plugin`, `version`, `root`) to `.claude/sdd-engineering-trace.jsonl` in the project. It is local only and never sent anywhere. Set `SDD_TRACE=off` to disable it or `SDD_TRACE_FILE` to move it. Pair it with `claude plugin list --json` to show which version a session actually loaded.

## Composition

SDD Engineering declares `dependencies` on Engineering Paved Path, Research Tools and Architecture Review (`^1.0`), so a single install enables the whole workflow: `researcher` for spec research, `architecture-reviewer` for the `/implement` review loop, and the shared conventions. Each hand-off still degrades gracefully if a dependency is disabled.

See the repository's [plugin ecosystem specification](../../docs/PLUGIN-ECOSYSTEM-SPEC.md) for the dependency graph and public path rules.

Release conventions are documented in [RELEASES.md](RELEASES.md).

## Install

```text
/plugin marketplace add natata7/dev-digest-ai-marketplace
/plugin install sdd-engineering@dev-digest-ai-marketplace
```
