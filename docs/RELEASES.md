# Release process

Plugins use Semantic Versioning: `MAJOR.MINOR.PATCH`.

- MAJOR: breaking behavior or removal.
- MINOR: backward-compatible capability.
- PATCH: backward-compatible fix or documentation correction.

## Channels

- `main`: development and validation.
- `beta`: opt-in pre-release tags.
- `stable`: production tags and immutable sources.

## Release checklist

1. Update the plugin version in `.claude-plugin/plugin.json`.
2. Update `CHANGELOG.md` when the plugin has one.
3. Run `claude plugin validate --strict .`.
4. Run `node scripts/build-index.mjs`.
5. Review the generated catalog and security-sensitive changes.
6. Create and push an annotated tag such as `engineering-paved-path-v0.2.0`.
7. Verify a clean install from the intended channel.

## Updates and rollback

Keep plugin names stable after publication. Roll back by moving the stable channel to the last known-good tag, then publish a patch release with the fix. Never rewrite a published tag.

## Release helper

The release helper is intentionally dry-run by default:

```bash
node scripts/release.mjs --plugin engineering-paved-path --version 0.2.0
node scripts/release.mjs --plugin engineering-paved-path --version 0.2.0 --apply --tag
```

`--apply` updates `plugin.json`, runs strict validation, and rebuilds the site index. `--tag` creates an annotated local tag; pushing it remains an explicit command.

## Rollback helper

Rollback never rewrites a published tag. It restores one plugin directory from a known-good tag, then validates the result:

```bash
node scripts/rollback.mjs --plugin engineering-paved-path --to engineering-paved-path-v0.1.0
node scripts/rollback.mjs --plugin engineering-paved-path --to engineering-paved-path-v0.1.0 --apply
```

The applied rollback leaves the changes in the working tree so they can be reviewed and merged through the protected-branch pull request workflow. It does not commit or push automatically.
