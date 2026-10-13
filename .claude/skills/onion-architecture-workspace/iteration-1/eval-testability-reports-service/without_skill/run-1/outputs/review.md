# ReportService.generate: why it can't be unit-tested, and the fix

File: server/src/modules/reports/service.ts

## What's wrong

`generate` reaches for three concrete things itself:

1. `db` (module-level Drizzle singleton imported from `../../db/client`). The service runs `db.select().from(reviews/findings)` directly. That needs a live Postgres. This is why the only test is `service.it.test.ts` with `startPostgres()`/`seedReview()`.
2. `new Octokit({ auth: process.env.GITHUB_TOKEN })` built inside the method. That needs a real token and network. It also reads `process.env` inside the service, which is why the it-test sets `process.env.GITHUB_TOKEN` in `beforeAll`.
3. Drizzle table objects (`reviews`, `findings`) and `eq` used in the service. The service depends on the persistence schema, not on a domain shape.

The pure logic (the confidence bucketing, 0.8 / 0.5 thresholds) is tangled with that I/O in one method. There is no constructor injection (`new ReportService()` takes nothing), so a test has no seam to substitute anything. In onion terms, the application layer depends outward on infrastructure (Drizzle, Octokit, env) instead of on ports it owns.

A second problem: the GitHub call is not needed for bucketing at all. It only fetches `pr.title`. So a bucketing test is forced to pay for network and a token. Note also that `workspaceId` is accepted but never used, so the review lookup is not workspace-scoped (likely a tenancy bug; fix while you're there).

## What to change

1. Define two small ports (in `@devdigest/shared` or next to the module, per the repo's port convention):
   - `ReviewRepository`: `findReviewWithFindings(workspaceId, prId): Promise<{ repoFullName: string; prNumber: number; findings: { confidence: number }[] } | null>`
   - `PrMetaGateway` (or reuse an existing GitHub port if the repo has one): `getPrTitle(repoFullName, prNumber): Promise<string>`
2. Implement them as adapters/repository:
   - `repository.ts` holds the Drizzle queries (the two selects), returns plain objects, and filters by `workspaceId`.
   - A GitHub adapter wraps Octokit; the token is passed in by config, not read from `process.env` in the service.
3. Constructor-inject them:
   ```ts
   export class ReportService {
     constructor(private reviews: ReviewRepository, private github: PrMetaGateway) {}
     async generate(workspaceId: string, prId: string) {
       const review = await this.reviews.findReviewWithFindings(workspaceId, prId);
       if (!review) return null;
       const buckets = bucketByConfidence(review.findings);
       const prTitle = await this.github.getPrTitle(review.repoFullName, review.prNumber);
       return { prTitle, total: review.findings.length, buckets };
     }
   }
   ```
4. Extract the bucketing as a pure function `bucketByConfidence(findings)` (domain logic, no imports besides types). Export it and test it directly. This is the fastest test: no mocks at all.
5. Wire real implementations in `platform/container.ts` (composition root); routes get the service from there. Remove the `db`, `drizzle-orm`, `@octokit/rest` imports from service.ts.

## Resulting hermetic test

```ts
it('buckets by confidence', async () => {
  const repo = { findReviewWithFindings: async () => ({ repoFullName: 'o/r', prNumber: 1,
    findings: [{confidence:0.9},{confidence:0.6},{confidence:0.2}] }) };
  const gh = { getPrTitle: async () => 'T' };
  const r = await new ReportService(repo, gh).generate('ws-1', 'pr-1');
  expect(r?.buckets).toEqual({ high: 1, medium: 1, low: 1 });
});
```
Plus boundary cases for the pure function: 0.8 -> high, 0.5 -> medium, 0.49 -> low, empty list, and null when review is missing.

Keep `service.it.test.ts` only for the Drizzle repository (query + workspace scoping); drop the `GITHUB_TOKEN` hack from it.

## Minimal alternative

If you want the smallest change: just extract `bucketByConfidence` as a pure exported function and test that. It covers the bucketing with zero DB/GitHub, but `generate` itself stays untestable without the ports above.
