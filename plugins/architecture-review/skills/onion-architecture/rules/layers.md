# The four layers and the dependency rule

Onion Architecture (Jeffrey Palermo, 2008) arranges code in concentric rings. Each ring may only know about the rings inside it:

```
 ┌─────────────────────────────────────────┐
 │  Infrastructure          Presentation    │   outer rings: frameworks, DB,
 │  (repositories,          (routes,        │   HTTP clients, SDKs — swappable
 │   adapters)               controllers)   │
 │      ┌───────────────────────────┐       │
 │      │      Application          │       │   use-cases, orchestration,
 │      │      (services)           │       │   defines the ports it needs
 │      │   ┌───────────────┐       │       │
 │      │   │    Domain     │       │       │   business rules, entities —
 │      │   │  (pure logic) │       │       │   zero framework imports
 │      │   └───────────────┘       │       │
 │      └───────────────────────────┘       │
 └─────────────────────────────────────────┘
```

The rule that matters in practice: **an inner ring never imports a concrete type from an outer ring.** It depends only on an interface (a "port") that it — or something equally inward — defines. The outer ring implements that interface. This is the Dependency Inversion Principle applied at architecture level: swap the database or the LLM vendor and the application/domain code does not change.

## Import direction inside and across modules

```
routes  →  service  →  [port interface]  ←  repository
                              ↑
                   adapters (cross-cutting ports:
                   code host, LLM, git, embedder, ...)
```

A repository's doc comment saying "the only layer touching the database for this domain" is the rule enforced by convention; see [enforcement.md](enforcement.md) to make it structural.

## Which ring is new code in?

Ask, in order:

1. **Does it need a database row, an HTTP call, a filesystem path or an SDK client to run?** Yes → Infrastructure, and it must implement (or be reached through) a port.
2. **Does it decide *what* to do — orchestrating calls, checking business preconditions, shaping a use case — without doing I/O itself?** Yes → Application. It may call ports (interfaces), never concrete adapters.
3. **Is it a rule that would be true regardless of the web framework, database or vendor — a pure function of its inputs?** Yes → Domain. Colocate it in the module as a small pure file and keep it free of framework/ORM/SDK types.
4. **Does it translate a request into a service call, or a service result into a response?** Yes → Presentation. Nothing else belongs here.

If you cannot answer 1–4 confidently, the responsibility is mixed and should be split — see [anti-patterns.md](anti-patterns.md).

## Domain: pure business rules

The innermost ring has **zero** dependencies on frameworks, SDKs or I/O — not even their types. Such code is unit-testable with plain inputs and outputs: no mocks, no containers, no network. Litmus test: *"If I deleted every other file in this package except this one and its type dependencies, would it still compile and its tests still pass?"* If the answer needs a database, an API key or a running server, it is not domain logic yet.

Where domain logic lives in a CRUD-heavy backend: write it as a plain exported function colocated in the module, with parameter and return types free of request objects, ORM row types and SDK types; let the service call it and translate rows into the plain types it expects. Extract when the service would shrink and gain a clear unit-testable function; leave three-line one-offs inline.

## Application: use-case orchestration

Services take plain typed parameters extracted by the route (ids, DTOs), call ports and domain functions, and return plain results. They never import a framework request/response type, an ORM table or an SDK. A service that only forwards to its repository is a smell (see anti-patterns §3), not a requirement.

## Infrastructure: implementing ports

Repositories and adapters implement ports and map vendor shapes to shared/domain types at the boundary. They persist and fetch; they do not decide business policy.

## Presentation: thin entry points

Routes validate the request shape at the boundary (a schema library), call one service method, and map the result or error to a response. No business branching, no direct data access.

## Onion vs Clean vs Hexagonal

Hexagonal (Cockburn, 2005) frames everything as ports and adapters around one core. Onion (Palermo, 2008) adds explicit concentric rings inside that idea. Clean (Martin, 2012) names entities and use cases and states the dependency rule as a law. The practical takeaway is the same: name the rings, keep dependencies pointing inward, define ports where the core needs them.
