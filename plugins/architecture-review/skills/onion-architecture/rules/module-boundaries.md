# Module boundaries and port purity

Vertical slices (`modules/<feature>/`) only help if each slice's inside stays private. Three rules keep the inward dependency rule intact *between* modules and *across* ports, not just within one module.

## 1. Modules talk through services, never through each other's repositories or tables

```ts
// ❌ modules/digests/service.ts
import { ReviewRepository } from '../reviews/repository';
```

**Breaks:** the `reviews` module can no longer change its schema or scoping rules without silently breaking `digests`; the scoping and DTO mapping `ReviewService` performs are bypassed; the `digests` test now needs `reviews`' real persistence.
**Fix:** depend on what the other module *exposes* — its service (or a narrow port the consumer defines and the container satisfies with that service). Never import another module's repository or ORM row types, and never query its tables from your own repository. If the data you need is not exposed, add a method to the owning module's service.

## 2. Port signatures use only shared/domain types

```ts
// ❌ shared/ports.ts
getPull(ref: PrRef): Promise<RestEndpointMethodTypes['pulls']['get']['response']['data']>;
```

**Breaks:** the port exists so the vendor can be swapped, but its signature names the vendor's types — every consumer is coupled to that SDK, and a second vendor's adapter cannot implement the port without faking the first vendor's shapes.
**Fix:** return a plain shared type (`PrMeta`, a schema-inferred contract); the adapter maps the SDK response to it. Check every port method's parameters and return type for vendor, ORM and framework names.

## 3. Repositories persist and fetch; they do not decide

```ts
// ❌ repository.ts
.where(gte(findings.confidence, 0.7))               // "what counts as digest-worthy"
.orderBy(desc(sql`severity_rank * confidence`))      // "how important is it"
```

**Breaks:** a business policy (thresholds, ranking) is hidden in SQL, where it cannot be unit-tested without a database and cannot be reused by another caller.
**Fix:** the repository returns candidate rows by a plain criterion (tenant, time window); the policy lives in a pure domain function that the service calls. Query-level filtering for performance is fine when the *constant* comes from the domain, not when the repository invents the rule.
