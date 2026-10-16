import { readFile, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const componentRoots = ["plugins"];
const forbidden = [
  /\/Users\//u,
  /\/home\//u,
  /^[A-Z]:\\/mu,
  /dev-digest(?:-ai)?\//iu
];

const filesUnder = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await filesUnder(path)));
    else if (/\.(md|json|mjs|js)$/u.test(entry.name)) files.push(path);
  }
  return files;
};

const offenders = [];
for (const directory of componentRoots) {
  for (const file of await filesUnder(join(root, directory))) {
    const text = await readFile(file, "utf8");
    if (forbidden.some((pattern) => pattern.test(text))) offenders.push(relative(root, file));
  }
}

if (offenders.length) {
  console.error(`Repository-specific or absolute paths found in public components: ${offenders.join(", ")}`);
  process.exit(1);
}
console.log("Public component path check passed.");
