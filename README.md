# Dev Digest AI Marketplace

A searchable, static marketplace for Claude Code plugins, skills, agents, and engineering workflows.

## Repository layout

- `.claude-plugin/marketplace.json` — marketplace catalog.
- `plugins/` — published plugins.
- `docs/` — authoring, security, site, cost, and release guidance.
- `scripts/build-index.mjs` — deterministic build-time catalog indexer.
- `site/` — GitHub Pages frontend.
- `.github/workflows/` — strict validation and Pages deployment.

## Local development

Generate the catalog index:

```bash
node scripts/build-index.mjs
```

Then serve `site/` with any static file server. The UI performs local full-text search over the generated index and does not require a backend or API key.

Validate the marketplace:

```bash
claude plugin validate --strict .
```

## Add a plugin

Follow [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/PLUGIN-GUIDELINES.md](docs/PLUGIN-GUIDELINES.md). Every plugin must have a matching directory name and `plugin.json.name`, a README, documented dependencies, and no secrets or absolute paths.

## License

Unless a plugin declares another license, repository documentation and examples are available under MIT.
