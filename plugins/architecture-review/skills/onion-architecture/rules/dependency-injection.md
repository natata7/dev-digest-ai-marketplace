# Dependency injection: wiring ports to adapters

Onion Architecture only works if something decides which concrete adapter satisfies which port. That is the **composition root**: a single container (or `main`) built once per app instance and the only file allowed to import both ports and concrete adapters.

## Shape of the pattern

```ts
// platform/container.ts — the one place that knows both sides
import type { SecretsProvider, CodeHostClient, LLMProvider } from '../shared/ports'; // PORTS
import { EnvSecretsProvider } from '../adapters/secrets/env';                        // ADAPTERS
import { OctokitClient } from '../adapters/github/octokit';
import { OpenAIProvider } from '../adapters/llm/openai';

export interface ContainerOverrides {          // tests pass fakes here
  secrets?: SecretsProvider;
  github?: CodeHostClient;
  llm?: LLMProvider;
}

export function buildContainer(overrides: ContainerOverrides = {}) {
  const secrets = overrides.secrets ?? new EnvSecretsProvider();
  return {
    secrets,
    github: overrides.github ?? new OctokitClient(secrets),
    llm: overrides.llm ?? new OpenAIProvider(secrets),
  };
}
```

Import ports at the top, adapters below them, and let the container be the only file that knows both. Every service takes the container (or the specific piece it needs) and never imports an adapter class directly.

## Why overrides exist

A hermetic test hands a service a container built with a fake `LLMProvider` instead of a real client; the service behaves identically because it only ever called the interface. No network, no API key, no flakiness. See [testing-strategy.md](testing-strategy.md).

## Adding a new port + adapter pair

1. Define the interface where the core can import it (shared contracts package, or beside the service that needs it) — framework-agnostic.
2. Implement it in a new file under `adapters/<name>/`.
3. Add it to the container overrides and wire its default construction.
4. Services take it from the container; they never `import { YourAdapter }` directly.

## Scale the mechanism to the package

A pure core with exactly one port can take it as a plain function argument (`review(input: { llm: LLMProvider, ... })`). That is still dependency injection, scaled to the package's real complexity. Introduce a container once a module needs more than one or two ports; do not add a DI framework or decorators unless the project already uses one.
