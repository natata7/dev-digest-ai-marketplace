---
name: pr-self-review
description: "Manual workflow dispatcher for reviewing the current git diff or a PR. Use when the user asks to self-review a PR, run pr-self-review, or review mixed frontend/backend changes. Never auto-invoke from git hooks. Loads ui-architecture for frontend changes and onion-architecture for backend changes; a mixed diff loads both at once."
disable-model-invocation: true
metadata:
  type: workflow
  tags: workflow, pr-review, dispatcher
---

# pr-self-review

Manual **workflow** skill. It does not review code itself — it decides **which architecture skills to load**, then follows them.

## Hard rules

1. **No auto-call.** Do not install, enable or run any git hook (pre-commit, commit-msg, and similar). This skill runs only when the user invokes it.
2. **Dispatcher, not a duplicate.** Do not paste the contents of other skills into the review. Read the matching `SKILL.md` files and apply them.
3. **Mixed diffs load both packs at once.** If the diff touches frontend and backend, load both in the same turn — never pick only one.

## Step 1 — collect the diff

Use the user-supplied diff if they pasted one. Otherwise:

```sh
git diff --name-only HEAD
git diff HEAD
```

If they name a branch or PR, diff against the merge base. Stay read-only: do not commit, amend or change any remote.

## Step 2 — classify paths

Classify each changed path by what the code is, using the project's layout (read its conventions files if the mapping is not obvious):

| Code | Pack |
|---|---|
| Frontend (UI components, pages, client-side hooks; for example `client/`, `web/`, `app/`, `src/components/`) | `ui-architecture` (plus `react-best-practices` / `next-best-practices` only if the hunks need them) |
| Backend (routes, services, repositories, adapters, a pure core package; for example `server/`, `api/`, `services/`) | `onion-architecture` |
| Other (tests-only, docs, CI, root config) | No architecture pack unless a hunk clearly belongs to one of the above |

A path matches only one pack. A **diff** can match both.

## Step 3 — load skills

- **Frontend only** → read the `ui-architecture` skill and review with it.
- **Backend only** → read the `onion-architecture` skill and review with it.
- **Both** → read **both** skills **before** commenting, then apply both rule sets to the matching hunks in one review.

Do not load `pr-self-review` recursively.

## Step 4 — review

Report findings grouped by pack. Cite `file:line`. Frontend hunks: colocation, private route folders, no cross-feature imports, tests next to the source. Backend hunks: `route → service → port ← repository/adapter`; no adapter call from a route; dependencies point inward.

If a hunk is out of scope for both packs, say so in one line and skip it.
