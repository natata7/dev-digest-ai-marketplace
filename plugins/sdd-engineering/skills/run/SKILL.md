---
name: run
description: Manual-only retrospective of a finished multi-agent workflow, with evidence-backed cost, friction, duplication, misses, and process improvements.
disable-model-invocation: true
---

# Workflow retro

Run only when the user explicitly invokes the workflow retrospective. Never invoke it from a hook, implementation workflow, or another agent.

## Data sources

Use the conversation by default. A deep run may inspect the raw session transcript if the user explicitly asks for exact token and launch-order accounting. Never invent token numbers, costs, timings, or outcomes.

## Collect

Report:

- workflow scope, goal, span, and outcome;
- known token/cost data and fix-loop share;
- agents in launch order, including parallelism;
- friction and what made the workflow smooth;
- duplicated reads or context;
- misses, late findings, and missing validation.

Every item must cite the agent, workflow step, file, or command where it was observed. Drop unsupported claims.

## Propose

End with at most seven ranked proposals. Each proposal states the change, expected effect, cost (S/M/L), and where to implement it (prompt, skill, command, or plan template).

## Ledger

Append a new entry to `docs/retro/ledger.md` when that file exists or when the user explicitly requests a ledger. Read existing open entries first and ask how they should be closed. Never rewrite an older entry except its status line.

Classify durable codebase lessons separately from workflow lessons; durable lessons belong in the relevant engineering insights file.
