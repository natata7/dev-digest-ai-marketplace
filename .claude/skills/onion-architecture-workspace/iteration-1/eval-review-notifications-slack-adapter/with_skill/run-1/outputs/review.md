# Architecture review: Slack notifications

Files reviewed (fixtures, read-only), against the onion-architecture skill (`anti-patterns.md`, `layers.md`, `domain-layer.md`, `infrastructure-layer.md`, `dependency-injection.md`).

## Verdict

Four problems. Two are real dependency-rule violations (service builds its own adapter; port lives in the adapter file). One is a purity violation in reviewer-core (file I/O at import time). One is incomplete wiring in the container. Direction of the fix: **no new folders**, just move the port, inject the adapter, and make the scorer pure.

## Findings

### 1. [High] `NotificationService` constructs `SlackNotifier` itself and reads `process.env`
`server/src/modules/notifications/service.ts:1,5`

```ts
import { SlackNotifier } from '../../adapters/notify/slack';
private readonly notifier = new SlackNotifier(process.env.SLACK_TOKEN!);
```
Application layer imports a concrete adapter (and transitively `@slack/web-api`) and reads config. This is anti-pattern #7 ("skip the port"). Failure modes: `notifyReviewDone` cannot be unit-tested without a Slack client and a token (a hermetic test would hit the real SDK); swapping Slack for Teams/email means editing business logic; env reading is hidden inside the use case.

**Instead:** the service takes the port in its constructor: `constructor(private repo: NotificationRepository, private notifier: Notifier)`. Import only the `Notifier` type from `@devdigest/shared`. `container.ts` builds `SlackNotifier` and passes it in. Tests pass a fake `Notifier`.

### 2. [High] `Notifier` port is defined inside the adapter file
`server/src/adapters/notify/slack.ts:3-5`

The interface sits next to its one implementation (anti-pattern #4). Once finding 1 is fixed, the service would still have to import from `adapters/notify/slack`, so "depend on the abstraction" and "depend on Slack" look identical at the import line.

**Instead:** move `Notifier` to `server/src/vendor/shared/adapters.ts` (the `@devdigest/shared` port file, alongside `LLMProvider`, `CodeHostClient`). Note `src/vendor/` is a do-not-touch synced copy per CLAUDE.md: add it at the source of truth in `server/src/vendor/shared` and let the client mirror sync, do not hand-edit the client copy. `slack.ts` keeps only `export class SlackNotifier implements Notifier` and `import type { Notifier } from '@devdigest/shared'`. Optional improvement: name it for the use case (e.g. `send(channel, text)` is fine; Slack-specific "channel" semantics are acceptable but a neutral `recipient` would make Teams/email swaps painless).

### 3. [High] `severity.ts` in reviewer-core does file I/O at module load
`reviewer-core/src/severity.ts:1,4-6`

`readFileSync(new URL('./severity-weights.json', import.meta.url))` runs on import. reviewer-core's purity claim (no DB/GitHub/filesystem, per CLAUDE.md) is broken by a hidden filesystem read; it also makes the module depend on a sibling file being present at runtime/bundle time, blocks use from the CI runner or tests without that file, and fails at import (not call) time if the JSON is missing or malformed. The litmus test fails: the file cannot be tested with plain inputs.

**Instead:** keep the scoring functions pure and take weights as data. Either (a) `import weights from './severity-weights.json'` (static, bundled, `resolveJsonModule`), or better (b) define the weights as a `const SEVERITY_WEIGHTS: Record<Severity, number>` in a TS module, and give the functions a `weights` parameter defaulting to it. No `node:fs`, no `import.meta.url` lookups. Also tighten `Record<string, number>` / `string` return to the shared `Severity` type from `@devdigest/shared`.

Also minor: `worstSeverity` copies and sorts (O(n log n)) to find a max; a single `reduce` is simpler. And unknown severities silently score 0 (`?? 0`) - decide if that is intended.

### 4. [Placement] Does the scorer belong in reviewer-core at all?
Yes, conditionally: after finding 3 it is a pure function of `Finding[]`, which is exactly domain logic and fits reviewer-core (next to `grounding.ts`). But ask who consumes it. If only the notifications service uses it (e.g. to decide whether to ping Slack), a small pure `modules/notifications/rules.ts` in `server` is the lazier, equally correct home (domain-layer.md: "colocate in the module, import-free of Fastify/Drizzle/SDK"). Put it in reviewer-core only if the CI runner or review engine also needs it. Do not create it in both. The notification service must not import reviewer-core internals beyond its public export.

### 5. [Medium] Container wiring is incomplete and bypasses overrides
`server/src/platform/container.ts:9-17`

- The new port/adapter pair is not wired: no `SlackNotifier` construction, and `ContainerOverrides` has no `notifier?: Notifier`. That is why the service reached for `process.env` itself. Per dependency-injection.md "When you add a new port + adapter pair", steps 3-4 are missing.
- `notificationService` is built eagerly with no way to override its dependencies in tests.

**Instead:**
```ts
export interface ContainerOverrides { github?: ...; llm?: ...; notifier?: Notifier }
const notifier = overrides.notifier ?? new SlackNotifier(env.SLACK_TOKEN!);
const notificationService = new NotificationService(new NotificationRepository(db as never), notifier);
```
Container is the one file allowed to import both the port and the adapter, and it is the right place to read `env.SLACK_TOKEN` (and validate it, rather than `!`). If Slack is optional, construct a no-op notifier when the token is absent instead of crashing or using `!`.

Side note (outside the notifications change, verify before acting): the container imports `OpenRouterProvider` from `../adapters/llm/openrouter`, while the skill's reference has it coming from `@devdigest/reviewer-core`. Not a layering violation, only a thing to confirm.

### 6. [Low] Service is orchestration, which is fine
`notifyReviewDone` (channel lookup, skip if none, send, mark sent) is real application-layer orchestration, not an anemic pass-through, so keep it in `service.ts`. Two small notes: message formatting (`Review for PR ... finished`) is presentation text you may want as a pure helper for testing; and send-then-`markSent` is not atomic (a crash between them re-sends). Acceptable now; note it.

## Where each thing should live

| Thing | Currently | Should be |
|---|---|---|
| `Notifier` interface | `adapters/notify/slack.ts` | `server/src/vendor/shared/adapters.ts` (`@devdigest/shared`) |
| `SlackNotifier` (Slack SDK) | `adapters/notify/slack.ts` | Stays there (infrastructure), only `implements Notifier` |
| `new SlackNotifier(process.env...)` | inside `NotificationService` | `platform/container.ts`, injected; add `notifier` to `ContainerOverrides` |
| `NotificationService` | `modules/notifications/service.ts` | Stays (application); depends on `Notifier` port + repository only |
| `NotificationRepository` | `modules/notifications/repository.ts` | Stays (infrastructure) |
| Severity scorer | `reviewer-core/src/severity.ts` | reviewer-core if shared with the engine/CI, else `modules/notifications/rules.ts`; either way pure, weights passed in or statically imported, no `node:fs` |
| Severity weights | `severity-weights.json` read via `fs` | TS const / static JSON import |

## Test consequence
After the fixes: `NotificationService` is testable hermetically with a fake `Notifier` and a stub repo (no `.it.test.ts`); the scorer is testable with plain arrays; only `SlackNotifier` itself needs SDK mocking.
