# Marketplace site specification

The site is a static GitHub Pages catalog. GitHub Actions reads repository content at build time and writes `site/data/index.json`; the browser performs search locally without a backend or secret.

## Index scope

The build indexes every local plugin directory with a valid `plugin.json`, including its manifest metadata and text files with `.md`, `.json`, `.yaml`, `.yml`, and `.txt` extensions. Skills, agents, commands, hooks, MCP configuration, and LSP configuration are emitted as individual artifacts when they use the supported directory/layout conventions.

The root `README.md`, all Markdown files under `docs/`, the marketplace manifest, and external plugin entries declared by object sources are also indexed. External sources are represented as catalog metadata; the build does not clone or execute remote repositories.

The index includes `schemaVersion`, `generatedAt`, and the source commit when GitHub Actions provides `SOURCE_COMMIT`.

## MVP

- Full-text search across plugins, skills, agents, commands, hooks, and documentation.
- Relevance-weighted results with a type filter.
- Artifact cards with source links.
- Copyable installation commands.
- URL query state for shareable searches.

## Constraints

- No runtime GitHub API dependency for core search.
- No credentials in browser assets.
- Index generation must fail loudly on malformed manifests.
- All generated data must be reproducible from a clean checkout.
- New local catalog content is visible after the validation workflow and the Pages deployment rebuild the index.
