# Release process

Plugins use Semantic Versioning: `MAJOR.MINOR.PATCH`.

- MAJOR: breaking behavior or removal.
- MINOR: backward-compatible capability.
- PATCH: backward-compatible fix or documentation correction.

## Channels

Claude Code has no built-in release-channel concept; one marketplace serves one version of each plugin. Channels are two catalogs:

| Channel | Catalog name | Where it lives | What it serves |
|---|---|---|---|
| latest | `dev-digest-ai-marketplace` | `main`, relative-path entries | whatever is on `main` |
| stable | `dev-digest-ai-marketplace-stable` | branch `stable`, `git-subdir` entries pinned to release tags | only verified, tagged releases |

```text
/plugin marketplace add natata7/dev-digest-ai-marketplace          # latest
/plugin marketplace add natata7/dev-digest-ai-marketplace#stable   # stable
```

Regenerate the stable catalog on the `stable` branch after tagging; it pins each plugin to its newest `<plugin>--v<version>` tag, or to an explicit version:

```bash
git switch stable
git merge --ff-only main                      # or: git checkout main -- . to take the release commit
node scripts/build-stable-catalog.mjs --out .claude-plugin/marketplace.json
node scripts/build-stable-catalog.mjs --pin sdd-engineering=1.0.0 --out .claude-plugin/marketplace.json   # hold one plugin back
claude plugin validate --strict .
```

Two wrappers do the above safely (dry run by default, they refuse to run off `main` or on a dirty tree):

```bash
scripts/tag-release.sh --apply --push        # tag every plugin at its plugin.json version and publish the tags
scripts/promote-stable.sh --apply --push     # rebuild branch stable pinned to those tags and publish it
```

Because the stable catalog is the only difference between the branches, always rebuild it from `main`'s catalog instead of editing it by hand.

## Tags and dependencies

Tags are `<plugin>--v<version>` (double dash) and point at a commit whose `plugin.json` has that version. Claude Code resolves dependency version ranges against these tags, so `sdd-engineering` can require `^1.0` of `engineering-paved-path`, `research-tools` and `architecture-review`. Create them with `claude plugin tag` (wrapped by `scripts/release.mjs --apply --tag`) and push the tags explicitly.

## Release checklist

1. Update the plugin version in `.claude-plugin/plugin.json`.
2. Update `CHANGELOG.md` when the plugin has one.
3. Run `claude plugin validate --strict .`.
4. Run `node scripts/build-index.mjs`.
5. Review the generated catalog and security-sensitive changes.
6. Create and push an annotated tag such as `engineering-paved-path--v0.2.0`.
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
node scripts/rollback.mjs --plugin engineering-paved-path --to engineering-paved-path--v0.1.0
node scripts/rollback.mjs --plugin engineering-paved-path --to engineering-paved-path--v0.1.0 --apply
```

The applied rollback leaves the changes in the working tree so they can be reviewed and merged through the protected-branch pull request workflow. It does not commit or push automatically.
