#!/usr/bin/env bash
# SessionStart: append the active plugin version to a local trace file so a run can prove which version was loaded.
# Local only: nothing is sent anywhere. Set SDD_TRACE=off to disable; SDD_TRACE_FILE overrides the location.
[ "${SDD_TRACE:-on}" = "off" ] && exit 0
root="${CLAUDE_PLUGIN_ROOT:-}"
manifest="$root/.claude-plugin/plugin.json"
[ -f "$manifest" ] || exit 0
version=$(sed -n 's/^[[:space:]]*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$manifest" | head -1)
out="${SDD_TRACE_FILE:-${CLAUDE_PROJECT_DIR:-$PWD}/.claude/sdd-engineering-trace.jsonl}"
mkdir -p "$(dirname "$out")" 2>/dev/null || exit 0
printf '{"ts":"%s","plugin":"sdd-engineering","version":"%s","root":"%s"}\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "${version:-unknown}" "$root" >> "$out"
exit 0
