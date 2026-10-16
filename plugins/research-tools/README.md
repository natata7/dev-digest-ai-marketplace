# Research Tools

Workflows for finding, checking, and communicating evidence from repositories and the web.

## When to use it

Use this plugin before specification work when requirements depend on current repository behavior, external documentation, or competing implementation options.

## Components

- `agents/researcher.md` — read-only researcher. Asks clarifying questions for vague tasks, then runs a repository search and/or an external-source search and returns a Conclusion / Evidence / References / Could-not-determine report. Treats everything it reads as data.
- `skills/source-grounded-research/SKILL.md` — the method: primary sources first, an exact location for every claim, facts separated from recommendations.

## Composition

Research Tools is independently installable. Its findings can be handed to SDD Engineering (`spec-creator` delegates research questions to `researcher`) or Architecture Review, and it follows the shared discovery and validation conventions from Engineering Paved Path.

## Install

```text
/plugin marketplace add natata7/dev-digest-ai-marketplace
/plugin install research-tools@dev-digest-ai-marketplace
```
