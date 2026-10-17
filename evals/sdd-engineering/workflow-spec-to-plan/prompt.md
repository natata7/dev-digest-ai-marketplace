---
tags: [workflow]
plugins: ["../../../plugins/sdd-engineering", "../../../plugins/engineering-paved-path", "../../../plugins/research-tools", "../../../plugins/architecture-review"]
runs: 3
max_turns: 40
timeout_seconds: 900
allowed_tools: [Agent, Read, Glob, Grep]
---

Run the specification workflow for the feature below: first the spec-creator agent, then, once the spec exists, the implementation-planner agent. Finish with the paths of the two files.

Feature: a small command-line todo tool gets a `--json` flag on its `list` command that prints the todos as a JSON array instead of a table. Valid JSON goes to stdout, errors still go to stderr.

Use exactly these files so the result can be checked:
- spec: docs/specs/01-spec-todo-json/01-spec-todo-json.md
- plan: docs/specs/01-spec-todo-json/01-plan-todo-json.md

Everything below is already confirmed with the user, so ask no questions and do not stop for approval:
- There is no design, mockup or Figma for this feature.
- It touches one module only (the CLI), so the spec lives under docs/specs/.
- The repository is empty; there is no existing code, no INSIGHTS.md and no earlier specs.
- Planner: use single-agent execution mode. There are no vendored or do-not-touch files.
- Plan header must say `Approved: — (pending user review)`.
