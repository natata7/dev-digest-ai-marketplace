---
name: engineering-insights
description: Captures reusable engineering insights (patterns, mistakes, decisions, context) found while working in a module, and loads prior insights before new work starts. Use at the start of a task touching a module to read its INSIGHTS.md, and at the end of a session to decide whether a substantial, non-duplicate entry should be appended.
---

# Engineering Insights

Each module (package, service, app) keeps an `INSIGHTS.md` next to its code. This skill is the protocol for reading and appending to it.

## When this runs

- **Start of a task:** read the `INSIGHTS.md` of every module the task touches, before making changes. Briefly note what is relevant so it is clear the file was actually processed, not just loaded.
- **End of a task/session:** decide whether the session earned a new entry. Writing nothing is a valid, common outcome — most sessions do not clear the bar below.

## Rubrics

Every entry belongs to exactly one:

- **Pattern** — a working approach worth reusing
- **Mistake** — an approach that broke something and should not be repeated
- **Decision** — a choice made deliberately, with the reason
- **Context** — a non-obvious fact about the codebase or environment (environment quirk, external constraint, third-party limit)
- **Open Questions** — unresolved, not yet a decision; lighter weight than the four above

## Before writing: read first

1. Re-read the target module's `INSIGHTS.md`.
2. If the same insight is already recorded, write nothing.
3. If it corrects or contradicts an existing entry, do not edit or delete that entry — append a new dated note that references it.

## Anti-vague test

Write an entry only if it is all four:

- **Specific** — names a real file, line, command or error, not a vibe
- **Reusable** — a future session would act differently for knowing it
- **Actionable** — changes behavior, not just describes something
- **Non-obvious** — not already derivable from reading the code or README

Reject: "Promises can be tricky."
Keep: "`Promise.all()` on the ingest pipeline times out after 30 items — use `Promise.allSettled()` batched by 10 (`src/adapters/ingest.ts:88`)."

## Which file

Match the module the work touched (`<module>/INSIGHTS.md`). Work spanning several modules gets a separate entry in each module it actually changed — not one shared entry. If the module has no `INSIGHTS.md` yet and the entry clears the bar, create it with one heading per rubric.

## Format

Append under the matching rubric heading, newest entry on top:

```
### YYYY-MM-DD — <short claim>
<file:line evidence> — what was learned and why it matters.
```

## Housekeeping

- Append-only. Never rewrite or silently delete an old entry — a correction is a new dated entry that references the old one.
- If one rubric in a file passes roughly 40 entries, flag it to the user for a prune pass instead of trimming it yourself.
