# Anti-patterns to flag in review

Concrete violations, what they break, and the fix. Use this list verbatim as the review checklist for backend code.

## 1. A route querying the database directly

```ts
// ❌ in routes
app.get('/pulls/:id/reviews', async (req) => db.select().from(reviews).where(eq(reviews.prId, req.params.id)));
```

**Breaks:** presentation depends on infrastructure directly, skipping application. Business rules (tenant scoping, DTO shaping) get duplicated in every route that needs the data, or silently omitted.
**Fix:** the route calls `service.reviewsForPull(tenantId, prId)`; the service calls `repo.reviewsForPull(prId)`.

## 2. A service importing a framework or SDK type

```ts
// ❌ in service
import type { FastifyRequest } from 'fastify';
import type OpenAI from 'openai';
async function runReview(req: FastifyRequest) { ... }
```

**Breaks:** the application layer can only be called from an HTTP handler (or tested with a faked request), and is coupled to one SDK's shape instead of the port.
**Fix:** service methods take plain typed parameters extracted by the route and depend on the port interfaces (`LLMProvider`, `CodeHostClient`), never the SDK behind them.

## 3. Anemic service — a pass-through to the repository

```ts
// ❌ every method is exactly this
class FooService { async getFoo(id: string) { return this.repo.getFoo(id); } }
```

**Breaks:** not a hard violation, but the layer adds indirection without value, or business rules that should exist were skipped. Not every module needs meaningful application logic. If a service exists only to satisfy the pattern, ask whether the route calling the repository for that endpoint (with the seam left in place for when logic appears) is more honest than a hollow layer.

## 4. A port interface defined next to its single implementation

```ts
// ❌ adapters/github/octokit.ts
export interface CodeHostClient { ... }
export class OctokitGitHubClient implements CodeHostClient { ... }
```

**Breaks:** anything depending on the port now imports from the adapter's folder, so "depend on the abstraction" and "depend on the GitHub adapter" look identical; swapping vendors touches every import site instead of one factory.
**Fix:** the interface lives in the shared contracts/ports location; the adapter file only has `implements PortName`.

## 5. Fat route — business branching in the route

```ts
// ❌
app.post('/pulls/:id/review', async (req) => {
  if (req.body.all && workspace.plan === 'free') throw new AppError('plan_limit', 'Upgrade', 403);
});
```

**Breaks:** a business rule (plan limits) lives where only request-shape validation belongs; it is untestable without the web framework and invisible to a background job or CLI that needs the same rule.
**Fix:** move the rule into the service; the route stays a translation layer.

## 6. Reaching for an integration test to make an application-layer test pass

See [testing-strategy.md](testing-strategy.md) — "this business-logic test needs a real database" is a symptom to investigate.

## 7. Skipping the port for a "just this once" shortcut

```ts
// ❌ in service, "just for this one debug endpoint"
import { Octokit } from '@octokit/rest';
const octokit = new Octokit({ auth: token });
```

**Breaks:** every exception is invisible until the day you need to swap or mock that dependency. One exception silently erodes the guarantee that "swap the provider" or "mock the vendor in tests" is a one-file change.
**Fix:** go through the existing port from the container, or add the missing method to the port.

## 8. One module importing another module's repository

See [module-boundaries.md](module-boundaries.md) §1 — go through the owning module's service.

## 9. A port signature that names a vendor SDK type

See [module-boundaries.md](module-boundaries.md) §2 — ports return shared contracts; adapters do the mapping.

## 10. Business policy encoded in a repository query

See [module-boundaries.md](module-boundaries.md) §3 — thresholds and ranking belong in a pure domain function.
