import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const args = new Set(process.argv.slice(2));
const value = (name) => {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? null : process.argv[index + 1] ?? null;
};
const plugin = value("plugin");
const version = value("version");
const apply = args.has("--apply");
const tag = args.has("--tag");

if (!plugin || !version || !/^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error("Usage: node scripts/release.mjs --plugin <name> --version <x.y.z> [--apply] [--tag]");
  process.exit(1);
}

const normalizedVersion = version.startsWith("v") ? version.slice(1) : version;
const manifestPath = join(root, "plugins", plugin, ".claude-plugin", "plugin.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
if (manifest.name !== plugin) throw new Error(`Manifest name "${manifest.name}" does not match "${plugin}".`);

const run = (command, commandArgs) => execFileSync(command, commandArgs, { cwd: root, stdio: "inherit" });
const releaseTag = `${plugin}--v${normalizedVersion}`; // Claude Code resolves dependency ranges against <plugin>--v<version> tags
console.log(`${apply ? "Preparing" : "Dry run for"} ${plugin} ${normalizedVersion}`);

if (!apply) {
  console.log(`Would set ${manifestPath} version to ${normalizedVersion}.`);
  console.log(`Would validate the marketplace and build the search index.`);
  if (tag) console.log(`Would create annotated tag ${releaseTag}.`);
  console.log("Use --apply to make changes. Use --tag with --apply to create the tag.");
  process.exit(0);
}

manifest.version = normalizedVersion;
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
run("claude", ["plugin", "validate", "--strict", root]);
run("node", [join(root, "scripts", "build-index.mjs")]);
if (tag) {
  // claude plugin tag validates plugin.json against the marketplace entry and refuses a dirty tree or an existing tag,
  // so commit the version bump first.
  run("claude", ["plugin", "tag", join(root, "plugins", plugin), "--message", `Release ${plugin} %s`]);
  console.log(`Created ${releaseTag}. Push it explicitly with: git push origin ${releaseTag}`);
}
