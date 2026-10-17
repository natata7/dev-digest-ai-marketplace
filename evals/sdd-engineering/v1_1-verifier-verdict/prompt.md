---
tags: [v1_1]
plugins: ["../../../plugins/sdd-engineering", "../../../plugins/engineering-paved-path", "../../../plugins/research-tools", "../../../plugins/architecture-review"]
runs: 3
max_turns: 25
timeout_seconds: 600
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the plan-verifier agent to verify the implementation in src/ against the plan docs/specs/01-spec-greet/01-plan-greet.md and the spec docs/specs/01-spec-greet/01-spec-greet.md. No commands can be run in this environment, so verify by reading the code. Reply with the verifier's complete report, including its final verdict lines.
