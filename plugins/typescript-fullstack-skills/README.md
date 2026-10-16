# TypeScript Fullstack Skills

Stack skills for TypeScript full-stack projects. They are plain reference skills: nothing runs automatically, and Claude loads the relevant one when the task matches its description.

## Skills

| Skill | Use it for |
|---|---|
| `zod` | schema validation, parsing, error handling, type inference |
| `fastify-best-practices` | Fastify servers and REST APIs: routes, plugins, hooks, validation, testing, deployment |
| `drizzle-orm-patterns` | Drizzle ORM schemas, queries, relations, transactions, migrations |
| `postgresql-table-design` | PostgreSQL schema design, data types, indexing, constraints |
| `react-best-practices` | React components, hooks, state, performance, data fetching |
| `react-testing-library` | React component and hook tests with Vitest |
| `next-best-practices` | Next.js App Router conventions, RSC boundaries, data patterns, metadata |
| `typescript-expert` | type-level programming, tsconfig, performance, monorepos, migrations |
| `security` | OWASP-based review of auth, input handling, uploads, secrets, APIs |
| `mermaid-diagram` | flowcharts, sequence, class, ER and state diagrams in Markdown |

## Composition

Independently installable. `architecture-review`'s `ui-architecture` pack and `sdd-engineering`'s planner refer to these skills by name when a step needs them (framework, ORM, validation, testing); they work without them.

## Notes

- Several skills are reference collections adapted from public best-practice guides; review their sources before redistributing.
- No scripts, hooks or network access are included.

## Install

```text
/plugin marketplace add natata7/dev-digest-ai-marketplace
/plugin install typescript-fullstack-skills@dev-digest-ai-marketplace
```
