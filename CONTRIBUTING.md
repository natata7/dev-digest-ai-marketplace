# Contributing

Thank you for improving the Dev Digest AI marketplace. Start with [PLUGIN-GUIDELINES.md](docs/PLUGIN-GUIDELINES.md), which defines structure, manifests, dependency and security rules, checks, and the pull request checklist.

## Workflow

1. Create a branch from `main`.
2. Add or update a plugin under `plugins/<plugin-name>/`.
3. Update its manifest, README, and version when behavior changes.
4. Run `claude plugin validate --strict .`.
5. Run `node scripts/build-index.mjs`.
6. Run `node scripts/check-content.mjs`.
7. Open a pull request and request the owning team from `CODEOWNERS`.

The GitHub Actions validation must pass before merge. Do not commit generated secrets, local absolute paths, or credentials.
