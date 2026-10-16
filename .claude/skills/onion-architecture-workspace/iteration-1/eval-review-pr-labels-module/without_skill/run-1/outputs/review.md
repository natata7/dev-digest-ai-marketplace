# Review: server/src/modules/pr-labels (backend architecture)

Fixture: .claude/skills/onion-architecture/evals/fixtures/pr-labels/server/src/modules/pr-labels

## Problems

1. routes.ts:3-4,16 - route queries Drizzle directly (GET /pulls/:prId/labels)
   - Breaks: layering. Route imports `eq`, `prLabels` and runs `app.container.db.select()`, skipping service and repository. Worse, it has NO workspace filter, so it returns labels of any workspace for a given prId (cross-tenant data leak). It also returns raw DB rows as the API shape.
   - Fix: `return service.list(req.workspaceId, prId)`. Remove the drizzle/schema imports from routes.ts. Map rows to a shared Zod response contract.

2. routes.ts:22-25 - business rule (free plan max 3 labels) lives in the route
   - Breaks: policy is untestable without HTTP, will be duplicated by any other caller (MCP, jobs). Also racy: list-then-insert is a check-then-act, so concurrent requests can exceed 3.
   - Fix: move into `PrLabelService.add` (throw AppError there); pass plan as a plain value (`workspace.plan`), not the request. Enforce atomically in the repository (insert in a transaction with count, or a lock/constraint).

3. routes.ts:12 - service built inside the route with `new PrLabelService(app.container.prLabelsRepo)`
   - Breaks: composition happens in the delivery layer, bypassing platform/container.ts; tests cannot swap the service.
   - Fix: construct the repo and service in `platform/container.ts` and use `app.container.prLabelsService` in routes.

4. service.ts:1,11-17 - service depends on FastifyRequest
   - Breaks: application layer imports Fastify (outer layer), reads `req.userId` / `req.workspaceId`. Cannot be unit-tested or reused without faking a request.
   - Fix: `add(ctx: { workspaceId: string; userId: string; plan: Plan }, prId, name)` with a plain context object built in the route. Drop the fastify import.

5. service.ts:2 / repository.ts:1-3,6 - no port; service depends on the concrete Drizzle repository class
   - Breaks: inward dependency rule. The core knows the infrastructure implementation; the repo returns Drizzle row types (`returning()` row, `$inferSelect`) to the service and API. Testing needs a real DB.
   - Fix: define a `PrLabelRepo` port interface (and a domain `PrLabel` type / Zod contract) in `@devdigest/shared` or the module's domain; service depends on the interface; the Drizzle repository implements it and maps rows to the domain type. Tests use an in-memory fake.

6. repository.ts:15-21 - `insert` returns `row` possibly undefined, no uniqueness handling
   - Breaks: `[row]` is typed possibly undefined under noUncheckedIndexedAccess; duplicates of the same name on a PR are allowed (name is lowercased in the service, implying uniqueness intent) and the 3-label cap is bypassable via duplicates/races.
   - Fix: throw if no row returned; add a unique index (workspace_id, pr_id, name) via `pnpm db:generate` and `onConflictDoNothing`/map the conflict to a 409 AppError.

7. routes.ts:14-28 - no ownership check on prId; no response schema
   - Breaks: POST accepts any uuid prId without verifying the PR exists in the workspace (FK error -> 500, or labels on foreign PRs). Routes use bare `.parse` instead of the project's fastify-type-provider-zod `schema` so no OpenAPI/response serialization, and ZodError handling is ad hoc.
   - Fix: service verifies the PR belongs to the workspace (via a PR port) and throws not_found; declare `schema: { params, body, response }` on the routes.

## Summary
Critical: #1 (tenant leak + layer skip), #4/#5 (core coupled to Fastify and Drizzle), #2 (rule in route + race). Rest are hardening. Only repository.ts is close to correct (workspace scoping is right there).
