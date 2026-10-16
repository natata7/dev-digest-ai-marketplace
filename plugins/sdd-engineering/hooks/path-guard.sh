#!/usr/bin/env bash
# PreToolUse guard for Write|Edit. Applies only to the agents below (matched by agent_type in the hook payload);
# every other caller, including the main session, is allowed through. Requires jq.
command -v jq >/dev/null || { echo "path-guard: jq is required for sdd-engineering write guards" >&2; exit 1; }
input=$(cat)
agent=$(jq -r '.agent_type // empty' <<<"$input"); agent=${agent##*:}
f=$(jq -r '.tool_input.file_path // empty' <<<"$input")
root="${CLAUDE_PROJECT_DIR:-$PWD}"
case "$f" in *..*) f="" ;; esac
deny() { echo "$agent may only write $1 (got: ${f:-invalid path})" >&2; exit 2; }
case "$agent" in
  spec-creator)
    case "$f" in "$root"/docs/specs/*.md | "$root"/specs/*.md) ;; *) deny "*.md files under docs/specs/** or specs/**" ;; esac ;;
  implementation-planner)
    case "$f" in "$root"/docs/specs/*/[0-9][0-9]-plan-*.md | "$root"/specs/*/[0-9][0-9]-plan-*.md) ;; *) deny "NN-plan-*.md inside a spec folder under docs/specs/** or specs/**" ;; esac ;;
  doc-writer)
    case "$f" in *.md) ;; *) deny "*.md documentation files" ;; esac ;;
esac
exit 0
