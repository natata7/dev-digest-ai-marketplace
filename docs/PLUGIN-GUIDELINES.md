# Plugin authoring guidelines

This document is the source of truth for adding or changing marketplace plugins.

## Structure

Each plugin lives under `plugins/<plugin-name>/`:

```text
plugins/<plugin-name>/
├── .claude-plugin/plugin.json
├── skills/<skill-name>/SKILL.md
├── agents/<agent-name>.md
├── commands/<command-name>.md
├── hooks/hooks.json
├── .mcp.json
└── README.md
```

Only components that the plugin uses need to exist. Keep component files outside `.claude-plugin/`; that directory is for manifests.

## Manifest fields

`plugin.json` requires `name`. Add `description`, SemVer `version`, `author`, `license`, and `keywords` for published plugins. Use kebab-case names and keep the plugin manifest name equal to its marketplace entry name.

The marketplace manifest requires `name`, `owner.name`, and `plugins`. Every entry requires `name` and `source`.

## Dependency rules

- Prefer local components and explicit, minimal dependencies.
- Never commit secrets, tokens, private keys, or credentials.
- Do not use absolute paths; all paths must work from a clean checkout.
- Pin production Git sources to an immutable tag or full commit SHA where possible.
- Document required environment variables and external services.
- Review hooks, MCP/LSP servers, executables, and network access as security-sensitive code.

## Checks

Run from the repository root:

```bash
claude plugin validate --strict .
node scripts/build-index.mjs
node scripts/check-content.mjs
```

If a plugin changed, validate it directly too:

```bash
claude plugin validate --strict plugins/<plugin-name>
```

## Pull request checklist

- [ ] Structure and manifests follow this guide.
- [ ] Entry name matches `plugin.json.name`.
- [ ] README documents purpose, components, install, and examples.
- [ ] No secrets or absolute paths were added.
- [ ] Security-sensitive behavior is documented.
- [ ] Version and changelog are updated when behavior changes.
- [ ] Strict validation passes.
- [ ] Search index builds successfully.
- [ ] A reviewer from the owning team is requested.
