import { readFile, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const ignoredDirectories = new Set([".git", ".claude", "node_modules"]);
const textExtensions = new Set([".json", ".md", ".mjs", ".js", ".css", ".html", ".yml", ".yaml", ".txt"]);
const cyrillic = /[\u0400-\u04FF]/u;

const filesUnder = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await filesUnder(path)));
    else files.push(path);
  }
  return files;
};

const offenders = [];
for (const file of await filesUnder(root)) {
  if (!textExtensions.has(file.slice(file.lastIndexOf(".")))) continue;
  if (cyrillic.test(await readFile(file, "utf8"))) offenders.push(relative(root, file));
}

if (offenders.length) {
  console.error(`Non-English Cyrillic text found in: ${offenders.join(", ")}`);
  process.exit(1);
}
console.log("English-only content check passed.");
