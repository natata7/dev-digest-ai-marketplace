# Marketplace site specification

The site is a static GitHub Pages catalog. GitHub Actions reads repository content at build time and writes `site/data/index.json`; the browser performs search locally without a backend or secret.

## MVP

- Full-text search across plugins, skills, agents, commands, hooks, and documentation.
- Relevance-weighted results with type and category filters.
- Artifact cards with matched snippets and source links.
- Copyable installation commands.
- URL query state for shareable searches.

## Constraints

- No runtime GitHub API dependency for core search.
- No credentials in browser assets.
- Index generation must fail loudly on malformed manifests.
- All generated data must be reproducible from a clean checkout.
