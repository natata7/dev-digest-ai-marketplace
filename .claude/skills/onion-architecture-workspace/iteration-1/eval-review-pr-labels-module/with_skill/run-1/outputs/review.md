# Architecture review: `server/src/modules/pr-labels` (onion-architecture)

Files reviewed: `routes.ts`, `service.ts`, `repository.ts` (fixture copy under `.claude/skills/onion-architecture/evals/fixtures/pr-labels/`). Target layering: `routes.ts -> service.ts -> repository.ts`, with each layer importing only inward.

Verdict: do not open the PR yet. There are 2 blockers (one is a cross-tenant data leak), 2 high-severity layering violations and 3 smaller issues. `repository.ts` is the only file that is mostly correct.

## Blockers

### 1. `routes.ts:14-17` - GET handler queries Drizzle directly (and skips workspace scoping)
```ts
return app.container.db.select().from(prLabels).where(eq(prLabels.prId, prId));
```
- **What breaks:** Presentation talks to infrastructure and skips the application layer. This is also a real bug. The query filters by `prId` only. `PrLabelRepository.forPull` filters by `workspaceId` AND `prId`, and the POST path uses it. So any caller who knows or guesses a PR uuid can read another workspace's labels. The route also imports `drizzle-orm` and `../../db/schema`, so it cannot be tested without Postgres.
- **Fix:** Remove the `eq` and `prLabels` imports and the `db` access. Call `service.list(workspaceId, prId)`. That method already exists and delegates to the scoped `repo.forPull`. Get `workspaceId` the way `reviews/routes.ts` does (`getContext(container, req)`).

### 2. `routes.ts:22-25` - plan-limit business rule lives in the route
```ts
const existing = await service.list(req.workspaceId, prId);
if (req.workspace.plan === 'free' && existing.length >= 3) throw new AppError('plan_limit', ..., 403);
```
- **What breaks:** "free plan = max 3 labels per PR" is a business rule in the presentation layer. A job, CLI or MCP path that adds labels would bypass it, and it cannot be unit-tested without Fastify. It is also a check-then-insert sequence across two calls, so two concurrent POSTs can both pass the check and exceed the limit.
- **Fix:** Move it into `PrLabelService.add(workspaceId, plan, prId, name)`, taking `plan` as a plain string or enum. The service lists, applies the rule and throws `AppError`. The route only parses input and calls `service.add`. Define the limit as a named constant in the module. For the race, count and insert inside one transaction, with the service owning the boundary and passing a `tx`-capable repo. Alternatively, enforce it in the repo with a conditional insert. At minimum, leave a comment that the race exists.

## High

### 3. `service.ts:1,11-17` - application layer imports and uses `FastifyRequest`
```ts
import type { FastifyRequest } from 'fastify';
async add(req: FastifyRequest, prId, name) { ... req.userId ... req.workspaceId }
```
- **What breaks:** `service.ts` is coupled to the HTTP framework. It cannot be called from a background job or test without building a fake `FastifyRequest`, and it reads ambient request fields instead of explicit inputs. The same file already has the right shape in `list(workspaceId, prId)`, so `add` is inconsistent with it.
- **Fix:** Use plain typed params: `add(ctx: { workspaceId: string; userId: string; plan: Plan }, prId: string, name: string)`. The route extracts these from `req`. Remove the `fastify` import from `service.ts`.

### 4. `repository.ts` -> `service.ts` -> `routes.ts` - Drizzle row type leaks all the way to the HTTP response
`insert` returns `row` and `forPull` returns raw `prLabels` rows. The service passes them through and the route sends them (`reply.code(201).send(label)`).
- **What breaks:** The DB schema is the public API. A column change, such as a camelCase `prId`/`createdBy` or an internal column, changes the wire format. The repo convention is snake_case payloads (`pr_id`, `created_by`) typed by `@devdigest/shared` Zod contracts. `$inferSelect` types should stay at the infrastructure boundary.
- **Fix:** Add a `PrLabel` Zod schema and type in `server/src/vendor/shared` (source of truth, not the mirrored copy under `client/src/vendor`). Add a small `toDto` mapper in the module, like `reviewToDto` in `reviews/helpers.ts`. Have the service return DTOs. Use that schema as the route's `response` schema.

## Medium / minor

### 5. `routes.ts:8-9,11` - local ad-hoc schemas and untyped Fastify instance
`Params` and `AddBody` are defined locally and parsed by hand with `.parse(...)`. The reference route uses `appBase.withTypeProvider<ZodTypeProvider>()` with `schema: { params }`, and request contracts from `@devdigest/shared`.
- **Breaks:** The contract is not shared with the client and there is no response validation. A parse failure is not handled uniformly by the type provider.
- **Fix:** Move `AddLabelBody` and the params schema to `@devdigest/shared`. Register them via `schema:` on the route with `ZodTypeProvider`.

### 6. `routes.ts:12` / `service.ts:5` - wiring differs from the module convention
The route builds the service from `app.container.prLabelsRepo`. `ReviewService` takes the `Container` and builds its repo itself (`new ReviewRepository(container.db)`). Confirm that `prLabelsRepo` is actually registered in `platform/container.ts`, with a `ContainerOverrides` entry so tests can substitute a fake. Otherwise this is a runtime `undefined`.
- **Fix:** Either follow the `ReviewService(container)` pattern, or register `prLabelsRepo` in `container.ts` and `ContainerOverrides`. The route should not use `container.db` at all (see #1).

### 7. `service.ts:11-17` - missing precondition on `add`
`add` inserts a label for any `prId` without checking that the PR exists in the caller's workspace. The reference `runReview` does `repo.getPull(workspaceId, prId)` and throws `NotFoundError`. Without that check you get FK errors as 500s, or labels attached to another tenant's PR if the FK is not workspace-scoped.
- **Fix:** Verify the pull with a scoped repo lookup first, and throw `NotFoundError('Pull request not found')`. Once #2 and this check are in, the service holds real orchestration and is no longer anemic.

## What is already fine
- `repository.ts` imports only Drizzle and the schema, takes `Db` by constructor (transaction-friendly), has intention-named methods (`forPull`, `insert`), and scopes `forPull` by workspace. After the DTO mapping in #4 it needs no structural change.
- `service.ts` normalises the label name (trim and lowercase), which is legitimate application or domain logic. Keep it there.

## Suggested fix order
1. #1 (security) and #2.
2. #3 and #4 (together, since they change the service and route signatures).
3. #7, then #5 and #6.

Tests once fixed: unit-test `PrLabelService` with a stub repo (plan limit, name normalisation, not-found). That needs no Postgres and no Fastify. Keep a single `.it.test.ts` for `PrLabelRepository` scoping.
