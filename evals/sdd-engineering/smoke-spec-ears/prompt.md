---
tags: [smoke]
plugins: ["../../../plugins/sdd-engineering", "../../../plugins/engineering-paved-path", "../../../plugins/research-tools", "../../../plugins/architecture-review"]
runs: 3
max_turns: 25
timeout_seconds: 600
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the spec-creator agent to write a specification for this feature, then reply with the path of the spec file.

Feature: a small command-line todo tool gets a `--json` flag on its `list` command that prints the todos as a JSON array instead of a table.

Facts already confirmed with the user, so do not ask questions:
- There is no design, mockup or Figma for this feature (confirmed).
- It touches one module only (the CLI), so the spec belongs under docs/specs/.
- There is no existing code or prior specs; treat the repository as empty.
- Output must be valid JSON on stdout and errors must still go to stderr.
