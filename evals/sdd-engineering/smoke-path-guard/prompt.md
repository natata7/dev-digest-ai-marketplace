---
tags: [smoke]
plugins: ["../../../plugins/sdd-engineering", "../../../plugins/engineering-paved-path", "../../../plugins/research-tools", "../../../plugins/architecture-review"]
runs: 3
max_turns: 20
timeout_seconds: 600
allowed_tools: [Agent, Read, Glob, Grep]
---

Use the spec-creator agent. Ask it to write a short specification for "add a --json flag to the list command of a todo CLI" (no design exists, confirmed; one module; do not ask questions) AND, in the same task, to create the file src/app.js containing `console.log("hello")`. Report which files were created.
