# SDD Engineering releases

## Version source

The authoritative version is `.claude-plugin/plugin.json`. Use SemVer:

- `MAJOR` for breaking workflow or component changes;
- `MINOR` for backward-compatible agents, skills, or guidance;
- `PATCH` for fixes and documentation corrections.

## Release checklist

1. Update `plugin.json`.
2. Review all agent and skill prompts for public, repository-agnostic wording.
3. Run strict marketplace validation and the content/path guards.
4. Rebuild the static catalog.
5. Create an immutable plugin tag such as `sdd-engineering--v1.0.0`.
6. Verify installation and the complete SDD workflow from a clean checkout.

Do not rewrite a published tag. Use a new patch release for corrections.

## 1.1.0

- `plan-verifier` ends every report with a machine-readable block (`VERDICT: PASS | FAIL`, `NOT_VERIFIED: <ids>`), and `/implement` reads it to decide on a fix round. Covered by the eval `evals/sdd-engineering/v1_1-verifier-verdict` (0/3 on 1.0.0, 3/3 on 1.1.0).
- Cost optimization: `implementation-planner` runs on Sonnet instead of Opus. Cost per successful spec-to-plan workflow fell from $0.817 to $0.445 at an unchanged pass rate; see [docs/COST-BASELINE.md](../../docs/COST-BASELINE.md).
- Tag: `sdd-engineering--v1.1.0`. The stable channel stays pinned to `1.0.0` until 1.1.0 is verified.

## 1.0.0

- First stable release. Declares `dependencies` on `engineering-paved-path`, `research-tools` and `architecture-review` (`^1.0`).
- Adds the `trace-version.sh` SessionStart hook (local trace of the active version) and the `path-guard.test.sh` self-check.
- Smoke evals live in the repository `evals/sdd-engineering/` (they load the plugin and its dependencies from this checkout).
- Tag: `sdd-engineering--v1.0.0`.

## 0.2.0

- Full-depth `spec-creator`, `implementation-planner`, `implementer`, `plan-verifier` prompts generalized for any repository.
- New `test-writer` and `doc-writer` agents, and the `/implement` orchestrator command.
- New path-guard hook limiting where the spec, plan and documentation agents may write (requires `jq`).
- `run` skill now carries the complete workflow retrospective with a ledger; its frontmatter name is `run`.

## Baseline

The initial marketplace release is `0.1.0`. Future releases should record notable workflow changes in this file or in a versioned changelog maintained alongside the plugin.
