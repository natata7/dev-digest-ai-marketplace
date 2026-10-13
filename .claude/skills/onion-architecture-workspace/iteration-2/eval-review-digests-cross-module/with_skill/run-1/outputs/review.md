# Architecture review: `modules/digests` (onion-architecture)

Scope: routes.ts, service.ts, repository.ts, format.ts, vendor/shared/adapters.ts, platform/container.ts. No code edited.

Summary: 5 violations (2 high, 3 medium) plus smaller notes. Presentation, application and infrastructure each have a leak. The service itself imports no Fastify/Drizzle, which is good.

## What is fine
- `service.ts` imports Fastify or Drizzle nowhere, and takes plain `workspaceId`/`prId` strings. Route does Zod parsing at the boundary.
- `format.ts` is pure (no imports). It is a valid domain-style function. It is not a violation.
- `DigestRepository` is injected into the service as a type-only import (`import type`), so the service doesn't depend on the concrete class at runtime.

## Findings

### 1. [High] Digests reaches into another module's repository (service.ts:2, routes.ts:5,12)
`service.ts` does a value import of `ReviewRepository` from `../reviews/repository` and calls `latestForPull`. `routes.ts` also imports and instantiates it.
Why it matters: `reviews` can no longer change its schema or workspace-scoping/DTO mapping without breaking `digests`; `ReviewService` rules are bypassed; testing `digests` needs reviews' real persistence. (module-boundaries.md §1)
Change:
- Use `ReviewService` from `modules/reviews`. If it doesn't expose "latest review for a pull", add that method to `ReviewService` (it owns it).
- Or have digests define a narrow consumer-side port (e.g. `LatestReview { latestForPull(ws, prId): Promise<{id: string} | null> }`) in `service.ts`, and let the container satisfy it with `ReviewService`.
- Remove the `ReviewRepository` import from both service.ts and routes.ts.

### 2. [High] Port signature names a vendor SDK type (vendor/shared/adapters.ts:1,5)
`CodeHostClient.getPull` returns `RestEndpointMethodTypes['pulls']['get']['response']['data']` from `@octokit/rest`. The shared port now depends on Octokit; a GitLab adapter would have to fake Octokit shapes, and every consumer (including `DigestService`) is transitively coupled. (module-boundaries.md §2)
Change: return a shared contract (existing `PrMeta`, or a minimal `{ number: number; ... }` Zod-inferred type in `contracts`), and make the Octokit adapter map the response to it. Remove the `@octokit/rest` import from the shared file. Note: this file lives under `src/vendor/shared`, which is the source of truth (edit `server/src/vendor/shared`, then it mirrors to client).
Also check `postComment(prNumber, body)`: it has no repo/PR ref, so it only works if the adapter holds hidden state. Prefer `postComment(ref: PrRef, body)`.

### 3. [High] Business policy in the repository (repository.ts:8-26)
`worthReporting` encodes "digest-worthy" (`confidence >= 0.7`), the ranking formula (`confidence * severity weight` 4/3/2/1) and the cap (`limit(10)`) in SQL. The name `worthReporting` is itself a policy decision. This can't be unit-tested without Postgres, can't be reused, and the repository "invents the rule". (module-boundaries.md §3)
Also: `orderBy(desc(sql\`priority\`))` refers to a select alias that is not guaranteed to resolve through Drizzle, and `findings.severity` is matched against string literals in raw SQL, which duplicates the severity enum.
Change:
- Rename to `findingsForReview(workspaceId, reviewId)`; return candidate rows by plain criterion (workspace + review), selecting `id, title, severity, confidence`.
- Add a pure domain function (e.g. `rankFindings(rows, { minConfidence: 0.7, limit: 10 })` in `digests/rank.ts`, or in `format.ts`'s sibling) with the severity-weight map and constants. `service.build` calls it. Unit-test it hermetically.
- If DB-level filtering is wanted for performance, pass the constant in from the domain rather than hard-coding it in the repository.

### 4. [Medium] Route wires infrastructure and builds the service itself (routes.ts:10-14)
`digestsRoutes` does `new DigestRepository(app.container.db)`, `new ReviewRepository(...)` and `new DigestService(...)`, so presentation depends on infrastructure (concrete repositories, `container.db`) rather than on the application layer only. Differs from the rule "Presentation depends on Application (service) only", and the service can't be swapped in route tests.
Change: construct `DigestService` (and its repository) in `platform/container.ts` (or a module factory called there) and have the route use `app.container.digests`. Add `digests?: DigestService` to `ContainerOverrides`. The route should only parse params and call the service.

### 5. [Medium] Container wiring incomplete / not overridable (container.ts)
- No digest wiring (see #4), and `ContainerOverrides` has no way to substitute the digest/review dependencies in tests.
- `github` uses `env.GITHUB_TOKEN!` non-null assertions: missing env fails late and cryptically; validate once at startup (typed config) rather than `!`.
- Container exposes the raw `db`, which is what lets routes build repositories. Once services are built in the container, routes shouldn't need `db`.
(Positive: `github` and `llm` are properly typed to ports with overrides, which is the right DI shape.)

### 6. [Low] Smaller notes
- `service.publish` calls `build` and then `markPublished` after the external call: if `postComment` succeeds and `markPublished` fails, a retry double-posts. Consider checking `digestRuns` first (idempotency) or recording before/with a status. This is application logic, so it stays in the service.
- `DigestItem` in `format.ts` types `severity` as `string`; use the shared severity enum so the domain function and the weight map stay in sync.
- `service.build` returns an ad hoc object with `null` for "no review"; `GET` then returns `null` with 200. Prefer a shared Zod response contract and a 404 `AppError` from the service.
- Service has real orchestration (build, rank, post, mark), so it is not an anemic pass-through. No change needed.
- `github.getPull({ workspaceId, prId })` passes a `PrRef` containing internal ids; verify `PrRef` shape matches (the adapter should resolve repo/number from it).

## Suggested order of fixes
1. Fix the port type (#2): shared contract, smallest blast radius, unblocks a clean service.
2. Replace `ReviewRepository` with `ReviewService` / consumer-defined port (#1).
3. Extract ranking/threshold into a pure function and slim the repository (#3).
4. Move construction into the container; route calls the service only (#4, #5).
5. Idempotency and contract tidy-ups (#6).

## Testability after the changes
- `DigestService` unit tests with stub review source, stub `DigestRepository`, stub `CodeHostClient` (no Postgres, no Octokit).
- `rankFindings` as a pure table test.
- Only `DigestRepository` (plain fetch + insert) needs a `.it.test.ts`.
