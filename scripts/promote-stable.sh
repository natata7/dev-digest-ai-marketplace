#!/usr/bin/env bash
# Rebuild the `stable` branch: main's content plus a catalog pinned to release tags.
# Dry run by default. Requires the release tags to exist (scripts/tag-release.sh).
#   scripts/promote-stable.sh                       # show the pins
#   scripts/promote-stable.sh --apply               # (re)create branch `stable` locally with the pinned catalog commit
#   scripts/promote-stable.sh --apply --push        # also publish the branch
#   scripts/promote-stable.sh --pin sdd-engineering=1.0.0 ...   # hold a plugin at an explicit version
# Users then run:  /plugin marketplace add <owner>/<repo>#stable
set -euo pipefail
cd "$(dirname "$0")/.."

apply=0; push=0; pins=()
while [ $# -gt 0 ]; do
  case "$1" in
    --apply) apply=1 ;;
    --push) push=1 ;;
    --pin) pins+=(--pin "$2"); shift ;;
    *) echo "unknown option: $1" >&2; exit 1 ;;
  esac
  shift
done
[ "$push" = 1 ] && [ "$apply" = 0 ] && { echo "--push needs --apply" >&2; exit 1; }

if [ "$apply" = 0 ]; then
  node scripts/build-stable-catalog.mjs ${pins[@]+"${pins[@]}"} | grep -E '"(name|ref)"' | grep -v -E '"(Dev Digest AI)"'
  echo "Dry run. Re-run with --apply to create branch stable."
  exit 0
fi

[ "$(git branch --show-current)" = "main" ] || { echo "Run from main." >&2; exit 1; }
[ -z "$(git status --porcelain --untracked-files=no)" ] || { echo "Working tree has uncommitted changes." >&2; exit 1; }
git switch -C stable
node scripts/build-stable-catalog.mjs ${pins[@]+"${pins[@]}"} --out .claude-plugin/marketplace.json
claude plugin validate --strict . >/dev/null
git add .claude-plugin/marketplace.json
git commit -m "chore(stable): pin catalog to release tags"
if [ "$push" = 1 ]; then git push --force-with-lease origin stable; fi
git switch main
echo "Branch stable ready$([ "$push" = 1 ] && echo ' and published')."
