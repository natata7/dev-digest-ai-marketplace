#!/usr/bin/env bash
# Tag every local plugin at the version in its plugin.json as <plugin>--v<version>.
# Dry run by default. Run from a clean, up-to-date main:
#   scripts/tag-release.sh              # show what would be tagged
#   scripts/tag-release.sh --apply      # create the tags locally
#   scripts/tag-release.sh --apply --push   # create and push them (publishes the release)
set -euo pipefail
cd "$(dirname "$0")/.."

apply=0; push=0
for arg in "$@"; do case "$arg" in --apply) apply=1 ;; --push) push=1 ;; *) echo "unknown option: $arg" >&2; exit 1 ;; esac; done
[ "$push" = 1 ] && [ "$apply" = 0 ] && { echo "--push needs --apply" >&2; exit 1; }

[ "$(git branch --show-current)" = "main" ] || { echo "Run from main (merge the release PR first)." >&2; exit 1; }
git fetch -q origin
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || { echo "main is not equal to origin/main; pull first." >&2; exit 1; }
[ -z "$(git status --porcelain --untracked-files=no)" ] || { echo "Working tree has uncommitted changes." >&2; exit 1; }
claude plugin validate --strict . >/dev/null

for dir in plugins/*/; do
  name=$(basename "$dir")
  version=$(sed -n 's/^[[:space:]]*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$dir/.claude-plugin/plugin.json" | head -1)
  tag="$name--v$version"
  if git rev-parse -q --verify "refs/tags/$tag" >/dev/null; then echo "skip  $tag (exists)"; continue; fi
  if [ "$apply" = 0 ]; then echo "would tag $tag"; continue; fi
  flags=(); [ "$push" = 1 ] && flags+=(--push)
  claude plugin tag "$dir" ${flags[@]+"${flags[@]}"}
done
[ "$apply" = 0 ] && echo "Dry run. Re-run with --apply (and --push) to publish."
exit 0
