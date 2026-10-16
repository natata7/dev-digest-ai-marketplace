# Testing strategy follows the layer boundary

The common split — integration tests that need a real database (often named `*.it.test.*`) versus hermetic tests that need nothing — is not an arbitrary naming rule. It is a direct consequence of the dependency rule, and it tells you which bucket a new test belongs in.

## Why hermetic tests are possible

A hermetic test cannot touch a database because the code under test never leaves the process. That holds for domain and application code only *if* they were written against ports rather than concrete adapters:

- A core function that takes an `LLMProvider` as a parameter can be tested with a stub returning canned results; orchestration, parsing and prompt-building all run for real, just without a real LLM behind them.
- A service is hermetic-testable the same way when it only calls its repository and the container's ports: build a container with overrides pointing at fakes, construct the service, assert on behavior. The moment a service queries the database itself instead of going through its repository, that test needs a real database — not because someone chose that, but because the code genuinely cannot run without one.

## The diagnostic

If you reach for a real database or testcontainers for something that "should" be business logic, check the code under test for a dependency-rule violation before accepting an integration test. Ask:

- Is this infrastructure behavior (a query's correctness, a real vendor API response shape)? → An integration test is correct and expected.
- Is this a business rule (scoring, validation, ordering, orchestration) entangled with a database call? → The entanglement is the bug. Extract the rule into a pure function or route it through a port; then it can move to a hermetic test.

## What to test where

| Layer | Test type | What it proves |
|---|---|---|
| Domain | hermetic unit test | pure function correctness — same input, same output |
| Application | hermetic test with stubbed ports / container overrides | orchestration — the right ports are called, in order, with the right data |
| Infrastructure | integration test (real database) or recorded-fixture test for external APIs | the adapter satisfies its port contract against the real thing |
| Presentation | hermetic test through the framework's in-process request injection, with a test container | request validation and response shaping, not business outcomes |

A PR that turns a hermetic application-layer test into an integration test "just to make it pass" is very likely papering over a layering violation.
