#!/usr/bin/env bash
# Self-check for path-guard.sh: each case is "label|expected exit|payload". Run: bash hooks/path-guard.test.sh
cd "$(dirname "$0")" || exit 1
fail=0
check() {
  echo "$3" | CLAUDE_PROJECT_DIR=/p ./path-guard.sh >/dev/null 2>&1; code=$?
  [ "$code" = "$2" ] && echo "ok   $1" || { echo "FAIL $1 (exit $code, wanted $2)"; fail=1; }
}
check "spec-creator writes a spec"            0 '{"agent_type":"sdd-engineering:spec-creator","tool_input":{"file_path":"/p/docs/specs/01-spec-x/01-spec-x.md"}}'
check "spec-creator blocked on code"          2 '{"agent_type":"spec-creator","tool_input":{"file_path":"/p/src/a.ts"}}'
check "spec-creator blocked on .. traversal"  2 '{"agent_type":"spec-creator","tool_input":{"file_path":"/p/docs/specs/../../src/a.md"}}'
check "planner writes a plan"                 0 '{"agent_type":"implementation-planner","tool_input":{"file_path":"/p/specs/01-spec-x/01-plan-x.md"}}'
check "planner blocked on the spec itself"    2 '{"agent_type":"implementation-planner","tool_input":{"file_path":"/p/specs/01-spec-x/01-spec-x.md"}}'
check "doc-writer blocked on code"            2 '{"agent_type":"doc-writer","tool_input":{"file_path":"/p/a.ts"}}'
check "main session is never blocked"         0 '{"tool_input":{"file_path":"/p/a.ts"}}'
check "other agents are never blocked"        0 '{"agent_type":"implementer","tool_input":{"file_path":"/p/a.ts"}}'
exit $fail
