---
name: onion-architecture
description: "Enforces the Onion Architecture inward dependency rule on backend code: domain and application logic stay ignorant of web frameworks, ORMs and vendor SDKs, and infrastructure only implements ports the core defines. Use when creating or reviewing a backend module (routes/controllers, services, repositories), adding or changing an adapter for an external system, wiring dependencies through a container or composition root, defining a port interface, or reviewing backend code for layering violations — even when the user does not say 'architecture' (for example 'add a repository for X', 'where should this service call the payment client from', 'is this route doing too much', 'how do I test this without a real database')."
metadata:
  tags: onion-architecture, clean-architecture, hexagonal, backend, dependency-injection, layering, ports-and-adapters
---

# Onion architecture

## When to use

- Adding a backend module or feature and deciding what goes in the route/controller, the service and the repository.
- Adding or changing an integration (code host, LLM provider, payment gateway, message queue, filesystem, email) behind an adapter.
- Wiring a new dependency through the container / composition root.
- Defining or changing a port interface.
- Reviewing backend code for layering violations: a route querying the database directly, a service importing framework or ORM types, one module reaching into another's repository, a port signature that names an SDK type, business logic that cannot be unit-tested without a database.
- Deciding whether new logic belongs in a pure core package (no I/O) or in the I/O-bearing server.

This skill does not cover frontend code (see `ui-architecture`).

## The dependency rule

> Dependencies point inward, only. Outer layers may import inner layers; inner layers may never import outer layers.

Concretely: `routes` → `service` → **port interface** ← `repository` / `adapters`. The port interface is the seam: inner code defines it, outer code implements it, and nothing inward-facing ever names a concrete outer-layer type (a framework request object, an ORM table, a vendor SDK's response type).

Many codebases organize by feature (vertical slices: `modules/<feature>/` holding the route, service and repository side by side) rather than by layer folder (`domain/`, `application/`, `infrastructure/`). Both are fine. Do not propose restructuring the folder tree; make the **dependency direction** inside the existing structure correct. Identify the layer by role, not by folder name.

## Layer → code mapping

| Layer | What it is | Typical location | Depends on |
|---|---|---|---|
| **Domain** | Business rules, entities, pure functions — zero framework/SDK imports | pure modules, a `core` package | nothing but types |
| **Application** | Use-case orchestration; defines the ports it needs as interfaces | `service` files, use-case classes | Domain + port interfaces (never concrete adapters) |
| **Infrastructure** | Implementations of ports: DB access, HTTP clients, SDKs | `repository` files, `adapters/*` | Application's port interfaces (implements them) |
| **Presentation** | Entry points translating the outside world into application calls | `routes` / controllers / CLI handlers | Application (service) only |

Ports live where the core can import them without importing infrastructure: a shared types/contracts package, or beside the service that needs them — **not** next to their one implementation. The composition root (container) is the single place allowed to know both sides: it constructs concrete adapters and hands them to services, and tests substitute fakes through overrides.

## Recommended reading order

- Adding a feature module: [layers](rules/layers.md) → [dependency-injection](rules/dependency-injection.md)
- Adding an external integration: [dependency-injection](rules/dependency-injection.md) → [module-boundaries](rules/module-boundaries.md)
- Reviewing a change for architecture issues: [anti-patterns](rules/anti-patterns.md) → [module-boundaries](rules/module-boundaries.md)
- "Why can't I test this without a database?": [testing-strategy](rules/testing-strategy.md)
- Want automated enforcement: [enforcement](rules/enforcement.md)

## Core principles

- **The dependency rule is directional, not optional.** A service may import a port interface; it may never import the class that implements it.
- **Ports are defined by the layer that needs them, not the layer that provides them.**
- **If it needs a real database or a real API key to unit-test, it is in the wrong layer.** Domain and application code must be testable with stubs alone.
- **Explain "why", not "must".** When reviewing, point at the concrete failure mode (untestable without infrastructure, swapping a provider forces edits to business logic) instead of citing the pattern name.
- **No ceremony without value.** Do not add a layer or an interface that carries no orchestration, no rule and no seam anyone needs.

## Rule files

- [rules/layers.md](rules/layers.md) — the rings, the import direction, and how to decide which ring new code belongs in
- [rules/module-boundaries.md](rules/module-boundaries.md) — modules talk through services, ports stay vendor-free, repositories do not decide
- [rules/dependency-injection.md](rules/dependency-injection.md) — wiring ports to adapters; test overrides
- [rules/testing-strategy.md](rules/testing-strategy.md) — hermetic vs integration tests follow the layer boundary
- [rules/anti-patterns.md](rules/anti-patterns.md) — concrete violations to flag, each with failure mode and fix
- [rules/enforcement.md](rules/enforcement.md) — optional lint-level enforcement
