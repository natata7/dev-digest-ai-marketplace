import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const args = new Set(process.argv.slice(2));
const value = (name) => {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? null : process.argv[index + 1] ?? null;
};
const plugin = value("plugin");
const target = value("to");
const apply = args.has("--apply");

if (!plugin || !target) {
  console.error("Usage: node scripts/rollback.mjs --plugin <name> --to <known-good-tag> [--apply]");
  process.exit(1);
}

const run = (command, commandArgs, options = {}) => execFileSync(command, commandArgs, { cwd: root, stdio: "inherit", ...options });
run("git", ["rev-parse", "--verify", `${target}^{commit}`]);
const current = run("git", ["rev-parse", "HEAD"], { stdio: "pipe" }).toString().trim();
const targetCommit = run("git", ["rev-parse", `${target}^{commit}`], { stdio: "pipe" }).toString().trim();
if (current === targetCommit) {
  console.log(`HEAD already points to ${target}. Nothing to roll back.`);
  process.exit(0);
}

console.log(`${apply ? "Applying" : "Dry run for"} rollback of ${plugin} to ${target}.`);
console.log("This restores only the selected plugin directory; it does not rewrite tags or push changes.");
if (!apply) {
  console.log(`Would run: git checkout ${target} -- plugins/${plugin}`);
  console.log("Then validate, review the diff, commit the rollback, and push through the normal protected-branch workflow.");
  process.exit(0);
}

run("git", ["checkout", target, "--", join("plugins", plugin)]);
run("claude", ["plugin", "validate", "--strict", root]);
run("node", [join(root, "scripts", "build-index.mjs")]);
console.log("Rollback files restored and validated. Review the diff and create a normal rollback commit.");
