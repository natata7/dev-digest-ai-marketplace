#!/usr/bin/env bash
# Fixture: a tiny repo where AC-1 is implemented and AC-2 is not.
set -euo pipefail
mkdir -p docs/specs/01-spec-greet src
cat > docs/specs/01-spec-greet/01-spec-greet.md <<'SPEC'
# 01-spec-greet
## Acceptance criteria
- AC-1: WHEN `greet(name)` is called with a non-empty name, the system shall return "Hello, <name>!".
- AC-2: IF `greet` is called with an empty name, THEN the system shall throw an Error with the message "name required".
SPEC
cat > docs/specs/01-spec-greet/01-plan-greet.md <<'PLAN'
# 01-plan-greet
Approved: 2026-01-01
- [x] Step 1 (AC-1): implement the greeting in src/greet.js
- [x] Step 2 (AC-2): reject an empty name in src/greet.js
PLAN
cat > src/greet.js <<'CODE'
export function greet(name) {
  return `Hello, ${name}!`;
}
CODE
