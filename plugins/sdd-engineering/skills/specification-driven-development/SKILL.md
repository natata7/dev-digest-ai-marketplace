---
name: specification-driven-development
description: Use when a feature needs explicit acceptance criteria, an implementation plan, and evidence that each requirement is covered. Describes the spec → plan → implement → verify loop and which sdd-engineering component handles each stage.
---

# Specification-driven development

## The loop

| Stage | Component | Output |
|---|---|---|
| 0. Research (optional) | `researcher` (research-tools) | evidence for open questions |
| 1. Specify | `spec-creator` agent | `NN-spec-<feature>.md` with EARS acceptance criteria AC-N, edge cases, NFRs, traceability; plus questions and design-analysis files |
| 2. Plan | `implementation-planner` agent | `NN-plan-<feature>.md`: steps with AC-N, files owned, skills, dependencies, execution mode; header `Approved:` |
| 3. Implement | `/implement` command + `implementer` agents | code in bounded steps; architecture review and fix loop; spec drift list |
| 4. Verify | `plan-verifier` agent | Coverage Matrix (Verified / Not Verified + evidence), saved as `NN-validation-<feature>.md` |
| 5. Test / document | `test-writer`, `doc-writer` agents | tests derived from AC-N; documentation |
| 6. Retrospective | `run` skill | friction, cost and proposals appended to a ledger |

## Principles

1. **Requirements are observable.** Express each as one EARS criterion (`WHEN … the system shall …`, `IF … THEN …`) with an ID and a measurable condition. If it cannot be phrased verifiably, it is a question, not an AC.
2. **Behavior in the spec, implementation in the plan.** The spec has no file names or class design; the plan has no new requirements.
3. **Unknowns stay visible.** Unresolved items are `[NEEDS CLARIFICATION]` or blocking questions. Nothing is guessed silently. Ask about a design or mockup first — a late design costs a spec revision and a UI rework.
4. **A human approves the plan.** `/implement` does not start until the plan header says `Approved: YYYY-MM-DD`.
5. **Implement in small, owned steps.** Each step names the files it may change and the AC-N it closes; shared contracts go first and alone; independent steps run in parallel.
6. **Mockups are acceptance criteria.** Decisions and review findings may not relax them.
7. **Verification is evidence, not opinion.** Every AC maps to code and test evidence or is Not Verified with a reason. Quote command output verbatim.
8. **The spec follows reality.** Deviations found during implementation are listed as spec drift for a human or `spec-creator` to resolve; the orchestrator does not rewrite the spec.

## Where files live

`docs/specs/NN-spec-<feature>/` when one module is touched, `specs/NN-spec-<feature>/` when several are. `NN` is the next free zero-padded number. Write permissions for the spec and plan agents are enforced by this plugin's path-guard hook (it relies on `jq` and on the hook payload carrying the agent name; without the agent name the guard allows the write and only the agent's instructions apply).
