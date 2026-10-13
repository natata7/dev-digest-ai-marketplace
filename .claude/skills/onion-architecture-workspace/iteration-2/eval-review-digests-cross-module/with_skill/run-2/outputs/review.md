# Architecture review: `digests` module (server)

Rules applied: onion-architecture SKILL.md, `rules/anti-patterns.md`, `rules/module-boundaries.md`. Fixture: `server/src/modules/digests/{routes,service,repository,format}.ts`, `server/src/vendor/shared/adapters.ts`, `server/src/platform/container.ts`.

## Verdict
Four real violations (two high, two medium) and a few smaller notes. `format.ts` is the one clean file.

| # | Severity | Problem | Where |
|---|---|---|---|
| 1 | High | Cross-module import of `ReviewRepository` | `service.ts:2,7`, `routes.ts:5,12` |
| 2 | High | Port signature names an Octokit type | `adapters.ts:1,5` (leaks into `service.ts:23-24`) |
| 3 | High | Business policy (threshold + ranking) in the repository SQL | `repository.ts:14,21,24,25` |
| 4 | Medium | Route builds the service and concrete repositories itself; container has no digests wiring | `routes.ts:3-14`, `container.ts` |
| 5 | Low | Smaller issues (see below) | various |

## 1. Digests reaches into the reviews module's repository (High)
`service.ts` does `import { ReviewRepository } from '../reviews/repository'` and calls `latestForPull`. `routes.ts` constructs `new ReviewRepository(...)` too. See module-boundaries.md §1 and anti-pattern 8.

Why it matters:
- `reviews` can't change its schema or scoping without silently breaking `digests`.
- The workspace scoping and DTO mapping that `ReviewService` does are bypassed.
- Testing `DigestService` needs `reviews`' real persistence, because the dependency is a concrete class rather than a stub-able seam.
- The import is a value import, not `import type`, so it's a runtime coupling.

Change:
- Depend on what `reviews` exposes: its `ReviewService`. If it lacks a "latest review for pull" method, add one there (for example `latestForPull(workspaceId, prId)` returning a shared contract type).
- Preferably have `DigestService` declare a narrow consumer-side port, such as `LatestReviewSource { latestForPull(workspaceId, prId): Promise<{ id: string } | null> }`. The container satisfies it with `ReviewService`.
- Remove `ReviewRepository` from `routes.ts` and `service.ts` entirely.

## 2. `CodeHostClient` port leaks Octokit (High)
`adapters.ts` imports `RestEndpointMethodTypes` from `@octokit/rest`, and `getPull` returns `RestEndpointMethodTypes['pulls']['get']['response']['data']`. See module-boundaries.md §2.

Why it matters:
- A port exists so the vendor can be swapped. Every consumer, including `DigestService` at `pull.number`, is now typed against Octokit's response shape.
- A GitLab adapter would have to fake Octokit shapes.
- The shared package picks up a vendor dependency, which inverts the dependency rule.

Change:
- Return a shared contract, for example `Promise<PrMeta>` (or a minimal `{ number: number; ... }` Zod type in `contracts`).
- Have `OctokitGitHubClient.getPull` map the SDK response into it. Mapping is the adapter's job.
- Drop the `@octokit/rest` import from `adapters.ts`.
- Check the other port methods for `Octokit`, `openai`, `drizzle` and `Fastify` names. `LLMProvider` and `Embedder` are clean in this fixture.
- Related: `postComment(prNumber, body)` has no repo/PrRef, so it is ambiguous across repos. Consider `postComment(ref: PrRef, body)` while you're changing the port.

## 3. Ranking and threshold policy live in SQL (High)
`DigestRepository.worthReporting` hard-codes three business decisions:
- "worth reporting" means `confidence >= 0.7` (`repository.ts:21`).
- Importance equals `confidence * severity weight` with critical=4, high=3, medium=2, other=1 (`repository.ts:14`).
- Top 10 (`repository.ts:25`).

See module-boundaries.md §3 and anti-pattern 10.

Why it matters:
- The policy is unit-testable only with Postgres.
- Nothing else (a CLI, a job, another channel) can reuse it.
- Changing a weight means editing a SQL string.
- `orderBy(desc(sql\`priority\`))` depends on the output alias, which is fragile.
- The method name `worthReporting` is itself a business term inside the infrastructure layer.

Change:
- Rename the repository method to a plain criterion, for example `findingsForReview(workspaceId, reviewId)`. It returns the rows (id, title, severity, confidence) with workspace/review scoping only.
- Add a pure domain function, for example `rankFindings(rows, { minConfidence = 0.7, limit = 10 })`, in a new `rank.ts` or alongside `format.ts`. The constants and severity weights live there.
- `service.build` calls `repo.findingsForReview` and then `rankFindings`, then `renderDigest`.
- Hermetic unit tests for `rankFindings` need no DB. Keep `.it.test.ts` only for the plain query.
- A SQL-level filter for performance is acceptable only if the constant is imported from the domain function's module.
- `DigestItem.priority` becomes computed output of the domain function rather than a DB column alias.

## 4. Composition in the route; container is incomplete (Medium)
`digestsRoutes` does `new DigestService(new DigestRepository(app.container.db), new ReviewRepository(app.container.db), app.container.github)`. The presentation layer therefore imports and instantiates infrastructure classes. `container.ts` doesn't know the module exists. See dependency-injection and presentation-layer rules.

Why it matters:
- Routes should depend on the service only.
- Tests can't swap the repositories through `ContainerOverrides`, so you'd have to boot Fastify with a real DB.

Change:
- Build `DigestRepository` and `DigestService` in `platform/container.ts` (or a module factory it calls). Inject the reviews service per #1 and `github` per #2.
- Add an override entry, for example `digests?: DigestService`, to `ContainerOverrides`.
- Routes become `const service = app.container.digests;` and import nothing but `zod`, `fastify` and types.
- Minor: the container uses `env.GITHUB_TOKEN!` and `env.OPENROUTER_API_KEY!` non-null assertions. Validate config once at startup instead.

## 5. Smaller notes (Low)
- `service.build` returns `null` when no review exists, and the GET route sends that through as a 200 `null` body. Presentation should translate "no review" into a 404 (via the app's `AppError`), or the service should throw it.
- `publish` silently returns when there is no digest, but the route still replies 202. Decide the intended behavior and surface it.
- `publish` calls `postComment` and then `markPublished`. If the second step fails, a retry double-posts. Check "already published" first (idempotency) in the service, backed by a unique constraint on `digestRuns(reviewId)`. This is a correctness concern, not layering.
- `build()` is reused by `publish()`, which is good. It makes the digest a domain concept the service owns.
- `DigestItem.severity: string` is loose. Use the shared severity enum from contracts.

## What is already right
- `format.ts` (`renderDigest`) is pure, with no framework or DB imports, and exactly where domain logic should live. Keep it and add `rankFindings` next to it.
- `DigestService` takes `CodeHostClient` from `@devdigest/shared` rather than the concrete Octokit adapter, and the route takes plain `workspaceId`/`prId` parameters, with no Fastify types in the service.
- Routes validate params with Zod at the boundary and stay thin (no business branching).
- `LLMProvider` and `Embedder` ports are vendor-free, and `container.ts` follows the override pattern.

## Suggested order of work
1. Fix the port (#2). It's a small change and unblocks clean typing.
2. Replace `ReviewRepository` with `ReviewService` or a consumer-side port (#1).
3. Extract the policy into a pure function and slim the repository (#3).
4. Move the wiring into the container and override seam (#4).
5. Tidy the HTTP and idempotency notes (#5).
