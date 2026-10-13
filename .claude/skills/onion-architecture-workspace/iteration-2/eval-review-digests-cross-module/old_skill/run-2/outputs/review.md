# Architecture review: `modules/digests`

Rule applied: dependencies point inward only. `routes.ts -> service.ts -> port <- repository.ts / adapters/*`. The vertical-slice layout stays as is; only the dependency direction needs fixing.

What is already right: `format.ts` is pure (no Fastify, Drizzle or SDK imports), so it is a valid domain module. `service.ts` takes `CodeHostClient` from `@devdigest/shared` and not `OctokitGitHubClient`. Zod validation sits at the route boundary. `DigestRepository` is the only file in the module that touches Drizzle. Workspace scoping is threaded through every call.

## Findings (most severe first)

### 1. Route builds its own repositories and service (presentation reaches into infrastructure)
`routes.ts:3-14` imports `DigestRepository` and `ReviewRepository` (both `repository.ts` files) and does `new DigestService(new DigestRepository(app.container.db), new ReviewRepository(...), app.container.github)`.
- Breaks: the route (presentation) now knows concrete infrastructure classes and `db`. It skips the application layer's seam, so tests cannot swap a repository or service without building a real `Db`. Every route file would also repeat this wiring.
- Fix: construct `DigestService` in `platform/container.ts` (or a module factory the container calls) and expose it. The route then only does `app.container.digests.build(...)` / `.publish(...)`. Remove both repository imports from `routes.ts`. Add `digests?: DigestService` to `ContainerOverrides` so route tests can stub the service.

### 2. Cross-module import of another module's concrete repository
`service.ts:2` imports `ReviewRepository` from `../reviews/repository` (a value import, not even `import type`). `routes.ts:5` imports it too.
- Breaks: `digests` is now coupled to the persistence shape of `reviews`. It reaches past the reviews application layer, so any workspace-scoping or DTO rules in `ReviewService` are bypassed. The service cannot be unit-tested without a real or hand-faked `ReviewRepository` class, and a schema change in `reviews` ripples into `digests`.
- Fix: `digests` must not import `reviews/repository`. Pick one:
  - (a) Depend on a narrow port that `digests` owns, e.g. `interface LatestReviewSource { latestForPull(workspaceId, prId): Promise<{ id: string } | null> }`. Wire it in the container using the reviews module's public service or repository. The digests service sees only the interface.
  - (b) Call `ReviewService` (the reviews application layer) through the container and use only its public method.
  - Either way, `digests/service.ts` ends with zero imports from `../reviews/*` internals.

### 3. Business rules live in the repository (infrastructure doing domain work)
`repository.ts:8-25` encodes the digest policy in SQL:
- confidence threshold `>= 0.7`;
- severity weights (`critical 4, high 3, medium 2, else 1`);
- priority formula (`confidence * weight`);
- top-N limit of `10`.

- Breaks: these are business rules ("what is worth reporting", "how to rank") and they are invisible to hermetic tests. They can only be tested through Postgres (`.it.test.ts`). Any other consumer (CLI, MCP, job) must duplicate them.
- Fix: `repository.ts` returns the review's findings (`id, title, severity, confidence`), scoped by workspace and review, with no ranking. Put `rankFindings(findings, { minConfidence, limit })` plus the weight table in a pure module (e.g. `digests/rank.ts`, next to `format.ts`). `DigestService.build` calls it. Unit-test it with plain arrays. Keep only data access in SQL.

### 4. Likely bug in the same query
`repository.ts:24` does `desc(sql\`priority\`)`, but the `priority` expression at line 14 is not aliased (`... as priority` is missing). Drizzle's `select({priority: sql...})` does not add an SQL alias on its own, so the `ORDER BY priority` will fail or reference the wrong thing. Fixing finding 3 removes it (sorting moves to the pure function). If you keep SQL ordering, use `.as('priority')` or order by the expression itself.

### 5. Service depends on the concrete `DigestRepository` class (no port)
`service.ts:3` type-imports the class and uses it directly as the collaborator type.
- Breaks: the application layer is named after the infrastructure class, so a fake needs structural matching of the whole class, and the application layer does not own the contract it needs. This is milder than finding 2 (type-only, same module), but it is the same direction problem.
- Fix: define a small `DigestStore` interface in the digests module (`findingsForReview`, `markPublished`). `DigestService` depends on that, and `DigestRepository implements DigestStore`. A cross-module port that several modules need belongs in `@devdigest/shared/adapters.ts`. A module-private one can live beside `service.ts`.

### 6. Shared port leaks an Octokit type
`vendor/shared/adapters.ts:1,5` imports `RestEndpointMethodTypes` from `@octokit/rest` and uses it as the return type of `CodeHostClient.getPull`.
- Breaks: the port, which is the abstraction every service depends on, names a vendor SDK type. So `digests/service.ts` is transitively coupled to Octokit's response shape, a GitLab implementation must fabricate Octokit-shaped objects, and `@octokit/rest` becomes a dependency of the shared contracts package (which is mirrored into `client`). This defeats the purpose of the port.
- Fix: define a provider-neutral type in `contracts` (e.g. `PullInfo { number: number; title: string; headSha: string; ... }`, only the fields the services use). `getPull` returns `Promise<PullInfo>`. The Octokit adapter maps the SDK response into it. Drop the `@octokit/rest` import from `adapters.ts`. Note: `src/vendor/` is synced, so make this change in `server/src/vendor/shared`, the source of truth, and let the mirror sync.

### 7. Container wiring gaps and import consistency
`platform/container.ts`:
- It does not build or expose `digests` (see finding 1). The container is the only file allowed to see both ports and adapters, so it is the natural place to compose `DigestService`.
- `ContainerOverrides.llm` is a single `LLMProvider`, while the rest of the repo uses a provider map. This is not a digests problem, but check it is intended.
- `env.GITHUB_TOKEN!` / `env.OPENROUTER_API_KEY!` are non-null assertions that crash late with a vague error. Validate config at startup (Zod env schema) and fail with a clear message.
- The container returns an inferred object, not a named `Container` type. Services that take `Container` need an exported type, e.g. `export type Container = ReturnType<typeof buildContainer>`.
- Imports have no `.js` extension while the repo's container uses `.js`. Match the convention of neighbouring files.

### 8. Smaller application-layer issues in `service.ts`
- `publish` is non-atomic and not idempotent. It posts the comment, then `markPublished`. If the insert fails, a retry posts a duplicate PR comment. Check "already published for this review" first, or record the intent before posting. Decide which failure you can live with.
- `publish` re-runs `build` (a second DB read), so the published text can differ from what the user previewed with GET. Accept a `reviewId` or persist the rendered digest.
- `build` returns `null` for "no review", and the route turns it into a `200 null`. Throw/return a typed not-found so the route can answer 404. The route also replies `202` for work that is done synchronously, so use `200/204` or actually enqueue a job.
- `items`' `severity` is a bare `string` in `DigestItem`. Use the shared severity enum/Zod type so the weight table in finding 3 is exhaustive.

## Suggested target shape

```
routes.ts     -> app.container.digests.{build,publish}      (no repos, no new)
service.ts    -> DigestStore (own port) + LatestReviewSource (own port)
              + CodeHostClient (shared, vendor-neutral)
              + rank.ts / format.ts (pure domain)
repository.ts -> implements DigestStore (raw rows, no policy)
container.ts  -> only place that news DigestRepository, adapters, DigestService
```

Change order: 6 (port type), 2 and 5 (ports), 3 (move policy), 1 and 7 (wiring), then 4 and 8.
