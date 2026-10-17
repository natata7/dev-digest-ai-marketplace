// Generates the "stable" channel catalog: same plugins, each pinned to a release tag (<plugin>--v<version>).
// Usage: node scripts/build-stable-catalog.mjs [--pin plugin=1.0.0 ...] [--out .claude-plugin/marketplace.json]
// Run it on the `stable` branch, commit, and push the branch. Users add the channel with:
//   /plugin marketplace add <owner>/<repo>#stable
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const argv = process.argv.slice(2);
const values = (flag) => argv.flatMap((arg, i) => (arg === flag ? [argv[i + 1]] : []));
const pins = Object.fromEntries(values("--pin").map((pin) => pin.split("=")));
const out = values("--out")[0];

const main = JSON.parse(await readFile(join(root, ".claude-plugin", "marketplace.json"), "utf8"));
const repo = new URL(execFileSync("git", ["remote", "get-url", "origin"], { cwd: root }).toString().trim().replace(/^git@github\.com:/, "https://github.com/")).pathname.replace(/^\/|\.git$/g, "");
const tags = execFileSync("git", ["tag", "--list"], { cwd: root }).toString().split("\n").filter(Boolean);
const semver = (v) => v.split(/[.-]/).slice(0, 3).map(Number);
const newest = (name) => tags
  .filter((tag) => tag.startsWith(`${name}--v`))
  .map((tag) => tag.slice(name.length + 3))
  .sort((a, b) => { const [x, y] = [semver(a), semver(b)]; return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; })
  .at(-1);

const plugins = main.plugins.map((entry) => {
  if (typeof entry.source !== "string") return entry; // external entries are kept as declared
  const version = pins[entry.name] ?? newest(entry.name);
  if (!version) throw new Error(`No ${entry.name}--v* tag. Release the plugin first (scripts/release.mjs --apply --tag).`);
  if (!tags.includes(`${entry.name}--v${version}`)) throw new Error(`Tag ${entry.name}--v${version} does not exist.`);
  return { ...entry, source: { source: "git-subdir", url: `https://github.com/${repo}.git`, path: entry.source.replace(/^\.\//, ""), ref: `${entry.name}--v${version}` } };
});

const catalog = { ...main, name: `${main.name}-stable`, description: `Stable channel: ${main.description}`, plugins };
const text = `${JSON.stringify(catalog, null, 2)}\n`;
if (out) { await writeFile(resolve(root, out), text); console.log(`Wrote ${out}: ${plugins.map((p) => `${p.name}@${p.source.ref ?? "external"}`).join(", ")}`); }
else process.stdout.write(text);
