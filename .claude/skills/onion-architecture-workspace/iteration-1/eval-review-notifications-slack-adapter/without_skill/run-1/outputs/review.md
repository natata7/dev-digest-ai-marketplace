# Review: Slack notifications (architecture)

Files reviewed (fixture): server/src/adapters/notify/slack.ts, server/src/modules/notifications/service.ts, server/src/platform/container.ts, reviewer-core/src/severity.ts.

## Findings

### 1. Port defined in the adapter (slack.ts)
`Notifier` interface lives next to `SlackNotifier` in `adapters/notify`. The core must own the port; infrastructure implements it.
Move: `Notifier` (port) to `@devdigest/shared` (server/src/vendor/shared, alongside `CodeHostClient` / `LLMProvider`). `SlackNotifier` stays in `server/src/adapters/notify/slack.ts` and does `implements Notifier` imported from shared. Adapter location itself is correct.

### 2. Service constructs the concrete adapter and reads env (service.ts) - most serious
`private readonly notifier = new SlackNotifier(process.env.SLACK_TOKEN!)`: the application layer imports a vendor-backed adapter (`@slack/web-api` transitively), reads `process.env` directly, and cannot be tested without Slack (no way to inject a fake).
Fix: service takes `Notifier` via constructor (`constructor(repo, notifier: Notifier)`), importing only the type from shared. Remove the `adapters/...` import and `process.env`.

### 3. Composition root does not wire the notifier (container.ts)
Container builds the service with only the repo, and has no `notifier` override like `github`/`llm`. Fix: add `notifier?: Notifier` to `ContainerOverrides`; build `overrides.notifier ?? new SlackNotifier(env.SLACK_TOKEN!)` in `buildContainer`; pass to `new NotificationService(repo, notifier)`. Env reads belong here (or in config), not in services. Tests then override with a fake. (Also: `db as never` cast and `!` non-null assertions on env are smells; validate env at startup.)

### 4. Severity scorer does file I/O at import (reviewer-core/severity.ts)
reviewer-core must be pure (no filesystem). `readFileSync` + `JSON.parse` of `severity-weights.json` at module load breaks that, makes behaviour depend on a sidecar file/cwd/bundling, and throws at import if missing.
Fix: inline weights as a typed `const` in the file (e.g. `Record<Severity, number>`), or accept `weights` as a parameter with a default constant. Delete the json read. Placement in reviewer-core is otherwise right: it is pure domain logic over `Finding`. Also `worstSeverity` sorts a copy for a max (O(n log n)) and returns `string`; use a reduce and the `Severity` type from shared. Minor.

### 5. Possible issue: service mixes policy and message formatting
`notifyReviewDone` builds message text inline and takes primitives. Acceptable for now; if it grows, extract message formatting as a pure function. If severity should appear in the message, call reviewer-core's `severityScore` from the service (inward dependency, fine) rather than duplicating it. Not blocking.

## Where each thing should live

| Thing | Current | Should be |
|---|---|---|
| `Notifier` interface | adapters/notify/slack.ts | `@devdigest/shared` (server/src/vendor/shared source of truth) |
| `SlackNotifier` | adapters/notify/slack.ts | stays; implements shared `Notifier` |
| `NotificationService` | modules/notifications/service.ts | stays; receives `Notifier` by constructor, no env, no adapter import |
| Slack token / construction | inside service | `platform/container.ts` (with `notifier` override) |
| `NotificationRepository` | modules/notifications | stays (persistence of channel/sent state) |
| severity weights + scorer | reviewer-core/severity.ts (reads JSON) | stays in reviewer-core, weights inlined as a constant, no fs |

Dependency direction after fixes: container -> adapters + service; service -> shared port; adapter -> shared port; reviewer-core -> shared only.
