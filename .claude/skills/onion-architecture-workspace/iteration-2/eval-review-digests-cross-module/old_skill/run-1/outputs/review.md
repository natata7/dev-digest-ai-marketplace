# Onion-architecture review: `digests` module

Files reviewed (fixture `server/src/`): `modules/digests/{routes,service,repository,format}.ts`, `platform/container.ts`, `vendor/shared/adapters.ts`.
Note: the skill snapshot has no `module-boundaries.md`, so the cross-module and port-signature findings (2, 3) rest on the core dependency rule in SKILL.md and `anti-patterns.md`.

## Summary

Intended direction is `routes -> service -> port <- repository/adapter`. The module breaks it in 6 places. Highest impact: the route builds the whole object graph itself (1), the service reaches into another module's repository (2), and the `CodeHostClient` port leaks an Octokit type (3).

## Findings

### 1. [High] Route composes concrete infrastructure (`routes.ts:10-14`)
`digestsRoutes` does `new DigestRepository(app.container.db)`, `new ReviewRepository(...)` and `new DigestService(...)`. Presentation now imports repositories (infrastructure) and, via `ReviewRepository`, another module's internals. This skips the composition root, so a test cannot swap a fake without a real `Db`, and the route changes whenever the service's dependencies change.
**Change:** wire the service in `platform/container.ts` (or a module factory called from there) and have the route do only `app.container.digestService.build(...)`. Remove the `./repository` and `../reviews/repository` imports from `routes.ts`. Also return 404 when `build` yields `null` (currently `GET` returns 200 with a null body), and decide whether `publish` should be 202 when there was nothing to publish.

### 2. [High] Cross-module repository access (`service.ts:2,9,14`, `routes.ts:5`)
`DigestService` imports `ReviewRepository` from `../reviews/repository` (a value import, not even `import type`) and calls `latestForPull`. Modules must talk through the other module's service, not its persistence class. This couples digests to the reviews table layout and bypasses any rules `ReviewService` applies (workspace scoping, DTO shaping).
**Change:** depend on `ReviewService` (or a small port such as `LatestReviewLookup { latestForPull(workspaceId, prId): Promise<{ id: string } | null> }` that `ReviewService` satisfies). Inject it via the container. Delete the `reviews/repository` import from both `service.ts` and `routes.ts`.

### 3. [High] SDK type in the shared port (`vendor/shared/adapters.ts:1,5`)
`CodeHostClient.getPull` returns `RestEndpointMethodTypes['pulls']['get']['response']['data']` and the file imports `@octokit/rest`. The contract in the innermost shared package now names a vendor SDK; swapping to GitLab means breaking the port, and every consumer is typed against Octokit's shape. The service only needs `pull.number`.
**Change:** define a vendor-free DTO in `contracts` (e.g. `PullSummary { number: number; title: string; ... }`), make `getPull(ref): Promise<PullSummary>`, and map Octokit's response to it inside `OctokitGitHubClient`. Drop the `@octokit/rest` import from the shared file. (Edit the source of truth in `server/src/vendor/shared`, not the client mirror.) Consider adding a narrower method (`postComment` by `PrRef`) so the service does not need `getPull` just for the number.

### 4. [High] Business rules live in the repository (`repository.ts:8-26`)
The repository owns domain decisions: the 0.7 confidence cutoff, the severity weights (critical 4, high 3, medium 2, low 1), the priority formula, and the top-10 limit, all inside a SQL fragment. These rules cannot be unit-tested without Postgres, and changing "what is worth reporting" means editing SQL. The method name `worthReporting` is itself a business term. `orderBy(desc(sql\`priority\`))` also relies on an alias that is not in the select as a real column, which is fragile.
**Change:** the repository exposes plain data access, e.g. `findingsForReview(workspaceId, reviewId): Promise<Finding[]>` (typed, awaited, no Drizzle builder returned). Move the filter, weighting, sort and limit into a pure function (e.g. `rankFindings(findings, { minConfidence: 0.7, limit: 10 })` in the module's pure logic file, next to `format.ts`) called by the service. Unit-test it with plain arrays. If the volume ever justifies it, push the filter into SQL as a documented optimisation, not as the only home of the rule.

### 5. [Medium] Service depends on a concrete repository and persists with no port (`service.ts:3,7-11`)
`DigestService` takes `DigestRepository` (type-only import, but still the concrete class) and `ReviewRepository`. Application code should depend on interfaces it defines.
**Change:** declare `DigestStore { findingsForReview(...); markPublished(...) }` in the service file (or the shared ports) and let `DigestRepository implements DigestStore`. Tests then use an in-memory fake and the whole `build`/`publish` flow runs hermetically, no `.it.test.ts` needed.

### 6. [Medium] `publish` correctness / orchestration gaps (`service.ts:20-26`)
- It calls `this.build`, recomputing the digest rather than publishing what the user saw, and silently returns when there is no review.
- It posts the comment, then records `markPublished`; if the second step fails the comment is posted but not recorded, and a retry posts it twice. Nothing checks whether it was already published.
**Change:** check for an existing publish record first (idempotency), record intent or handle the failure order explicitly, and surface "nothing to publish" to the route (404/204) instead of returning undefined.

### 7. [Low] `format.ts` is fine as a pure helper, minor tidy-up
It has no framework imports and belongs in the application/domain side. But `DigestItem` duplicates the finding shape and `severity: string` is untyped. Reuse the shared `Finding`/severity enum from `@devdigest/shared` so the rank function and renderer share one type.

### 8. [Low] Container (`platform/container.ts`)
Reasonable as the composition root (it is the only place allowed to import `OctokitGitHubClient`/`OpenRouterProvider`, and `ContainerOverrides` allows fakes). Gaps: `digests` services are not registered (see 1); `ContainerOverrides` has no way to override repositories/services; `env.GITHUB_TOKEN!` non-null assertions defer a missing-config failure to the first API call. Validate env at startup.

## Suggested order of work
1. Fix the port (3), it unblocks a clean service signature.
2. Replace `ReviewRepository` with a `ReviewService`/port dependency (2) and the `DigestStore` interface (5).
3. Extract the ranking rule into a pure function and slim the repository (4).
4. Move wiring into the container and thin the routes (1); tidy publish semantics (6).

## Resulting layering
`routes.ts` (parse params, call `container.digestService`) -> `service.ts` (orchestrate using `DigestStore`, `ReviewService`/lookup port, `CodeHostClient`) -> pure `rankFindings` + `renderDigest` ; `repository.ts` and the Octokit adapter implement the ports; `container.ts` wires everything.
