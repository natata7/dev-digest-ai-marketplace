# Review: why `ReportService.generate` can't be unit-tested hermetically

Files read: `server/src/modules/reports/service.ts`, `service.it.test.ts` (fixture), plus the onion-architecture rules (`testing-strategy`, `application-layer`, `anti-patterns`, `dependency-injection`).

## Diagnosis

The `.it.test.ts` is a symptom, not a choice. `generate` is an application-layer use case with a pure business rule inside it (the confidence bucketing), but it is tangled with infrastructure. That is the "entanglement is the bug" case in `testing-strategy.md`. Three Dependency Rule violations in `service.ts`:

1. **Service queries Drizzle directly** (`service.ts:1-4, 8, 11`). It imports the global `db` singleton, `eq`, and the `reviews`/`findings` tables, and runs `db.select()` itself. There is no `repository.ts`. This is the "service reaches the DB without going through the repository" violation. It forces Postgres in tests (`startPostgres`, `seedReview`).
2. **Service news up a vendor SDK** (`service.ts:1, 19`). `new Octokit({ auth: process.env.GITHUB_TOKEN })` inside the method. This is anti-pattern #7 ("skipping the port"). It bypasses the existing `CodeHostClient` port (`container.github`) and reads env directly, so tests need a real token (`TEST_GITHUB_TOKEN`) and network. It also bypasses the `SecretsProvider`.
3. **No injection seam at all.** `ReportService` has no constructor and takes no `Container`. Compare `ReviewService`, which takes `Container` and uses `this.repo` and `container.*`. `ContainerOverrides` can't help because the class never receives a container. `db` is a module-level import, so you could only fake it with `vi.mock`, which hides the problem.

Secondary smell: the pure rule (`>=0.8` high, `>=0.5` medium, else low) lives inline in an I/O method, so it can't be tested without running the whole thing. Also note `workspaceId` is accepted but never used: the queries aren't workspace-scoped. This is a likely tenancy bug that goes away once the repo owns scoping (see `ReviewService.getPull(workspaceId, prId)`).

## What to change

### 1. Extract the bucketing as a domain function (the biggest win, smallest change)

```ts
// server/src/modules/reports/confidence.ts  (pure, no imports)
export interface ConfidenceBuckets { high: number; medium: number; low: number }
export function bucketByConfidence(rows: { confidence: number }[]): ConfidenceBuckets {
  const b = { high: 0, medium: 0, low: 0 };
  for (const f of rows) {
    if (f.confidence >= 0.8) b.high++;
    else if (f.confidence >= 0.5) b.medium++;
    else b.low++;
  }
  return b;
}
```

Test it with a plain `confidence.test.ts`, no stubs: `[0.9, 0.6, 0.2]` gives `{1,1,1}`, plus the boundaries 0.8, 0.5, 0.79, 0.49. This alone answers "unit-test the confidence bucketing quickly".

### 2. Add `reports/repository.ts` (infrastructure)

Owns all Drizzle: `getReviewForPull(workspaceId, prId)` returning `{ id, repoFullName, prNumber } | null`, and `findingConfidences(reviewId)`. Constructed as `new ReportRepository(container.db)`, like `ReviewRepository`. Move the `db` / `drizzle-orm` / schema imports here. Its correctness is what the existing `.it.test.ts` should then cover.

### 3. Use the `CodeHostClient` port instead of Octokit

Take the PR title from `container.github` (the `CodeHostClient` in `@devdigest/shared/adapters.ts`). If the port has no "get PR title/meta" method, add one to the port (a deliberate, reviewed change to `vendor/shared`, which is the source of truth), not a local `Octokit`. Remove `@octokit/rest` and `process.env.GITHUB_TOKEN` from the service. Token handling stays in the adapter and `SecretsProvider`.

### 4. Inject via `Container`

```ts
export class ReportService {
  private repo: ReportRepository;
  constructor(private container: Container) {
    this.repo = new ReportRepository(container.db);
  }
  async generate(workspaceId: string, prId: string) {
    const review = await this.repo.getReviewForPull(workspaceId, prId);
    if (!review) return null;
    const rows = await this.repo.findingConfidences(review.id);
    const pr = await this.container.github.getPull(review.repoFullName, review.prNumber); // port call (name per actual port)
    return { prTitle: pr.title, total: rows.length, buckets: bucketByConfidence(rows) };
  }
}
```

The service is now only domain calls plus port calls, matching the "Common shape" in `application-layer.md`. Note that `routes.ts` should construct it with the container, as the other modules do.

### 5. Tests after the change

| Test | File | Needs |
|---|---|---|
| Bucketing and thresholds | `confidence.test.ts` (hermetic) | nothing |
| `generate` orchestration (null review, title and total, buckets wired) | `service.test.ts` (hermetic) | a `Container` with `ContainerOverrides { github: fake }` and a stub repo (or a fake `db`), no Postgres, no token |
| Repo queries | `repository.it.test.ts` (existing `startPostgres`/`seedReview`) | real Postgres, no GitHub |

Drop `process.env.GITHUB_TOKEN = process.env.TEST_GITHUB_TOKEN` from the tests entirely.

## Quickest path

If you only want the bucketing test now: do step 1 (about 10 lines moved, `service.ts` calls `bucketByConfidence(rows)`). Do steps 2-4 to make `generate` itself hermetic and to fix the Octokit/env and workspace-scoping issues.
