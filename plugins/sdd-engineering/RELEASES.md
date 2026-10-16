# SDD Engineering releases

## Version source

The authoritative version is `.claude-plugin/plugin.json`. Use SemVer:

- `MAJOR` for breaking workflow or component changes;
- `MINOR` for backward-compatible agents, skills, or guidance;
- `PATCH` for fixes and documentation corrections.

## Release checklist

1. Update `plugin.json`.
2. Review all agent and skill prompts for public, repository-agnostic wording.
3. Run strict marketplace validation and the content/path guards.
4. Rebuild the static catalog.
5. Create an immutable plugin tag such as `sdd-engineering-v0.2.0`.
6. Verify installation and the complete SDD workflow from a clean checkout.

Do not rewrite a published tag. Use a new patch release for corrections.

## Current baseline

The initial marketplace release is `0.1.0`. Future releases should record notable workflow changes in this file or in a versioned changelog maintained alongside the plugin.
