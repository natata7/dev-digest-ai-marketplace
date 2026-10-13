import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const pluginsDir = join(root, "plugins");
const docsDir = join(root, "docs");
const output = join(root, "site", "data", "index.json");

const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));
const exists = async (file) => readFile(file).then(() => true).catch(() => false);
const filesUnder = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await filesUnder(path)));
    else files.push(path);
  }
  return files;
};

const componentType = (file) => {
  if (file.includes("/skills/")) return "skill";
  if (file.includes("/agents/")) return "agent";
  if (file.includes("/commands/")) return "command";
  if (file.includes("/hooks/")) return "hook";
  if (file.endsWith("/.mcp.json")) return "mcp";
  return "document";
};
const frontmatter = (text, key) => text.match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1]?.trim() ?? "";

const plugins = [];
const pluginEntries = await readdir(pluginsDir, { withFileTypes: true });
for (const pluginEntry of pluginEntries.filter((entry) => entry.isDirectory())) {
  const pluginName = pluginEntry.name;
  const pluginRoot = join(pluginsDir, pluginName);
  const manifestPath = join(pluginRoot, ".claude-plugin", "plugin.json");
  const manifest = await readJson(manifestPath);
  if (manifest.name !== pluginName) {
    throw new Error(`Plugin directory "${pluginName}" must match manifest name "${manifest.name}".`);
  }
  const files = await filesUnder(pluginRoot);
  const content = [];
  for (const file of files) {
    if (file.endsWith(".md") || file.endsWith(".json")) {
      content.push(await readFile(file, "utf8"));
    }
  }
  const components = files
    .filter((file) => !file.endsWith("plugin.json") && componentType(file) !== "document")
    .map((file) => ({ type: componentType(file), path: relative(root, file) }));
  const componentArtifacts = [];
  for (const file of files.filter((candidate) => ["skill", "agent", "command"].includes(componentType(candidate)))) {
    const text = await readFile(file, "utf8");
    const type = componentType(file);
    const fallbackName = file.split("/").pop().replace(/\.(md|json)$/i, "");
    componentArtifacts.push({
      id: `${manifest.name}:${type}:${fallbackName}`,
      name: frontmatter(text, "name") || fallbackName,
      type,
      description: frontmatter(text, "description") || `A ${type} provided by ${manifest.name}.`,
      parent: manifest.name,
      author: manifest.author?.name ?? null,
      sourcePath: relative(root, file),
      install: `/plugin install ${manifest.name}@dev-digest-ai-marketplace`,
      text: [manifest.name, manifest.description, text].join("\n")
    });
  }
  plugins.push({
    id: manifest.name,
    name: manifest.name,
    type: "plugin",
    description: manifest.description ?? "",
    version: manifest.version ?? null,
    author: manifest.author?.name ?? null,
    keywords: manifest.keywords ?? [],
    category: manifest.keywords?.[0] ?? "general",
    sourcePath: relative(root, pluginRoot),
    install: `/plugin install ${manifest.name}@dev-digest-ai-marketplace`,
    text: [manifest.name, manifest.description, ...(manifest.keywords ?? []), ...content].join("\n"),
    components,
    componentArtifacts
  });
}

const documents = [];
for (const file of await filesUnder(docsDir)) {
  if (!file.endsWith(".md")) continue;
  const text = await readFile(file, "utf8");
  documents.push({
    id: relative(root, file).replaceAll("/", ":"),
    name: file.split("/").pop().replace(/\.md$/i, ""),
    type: "document",
    description: text.split("\n").find((line) => line.startsWith("# "))?.replace(/^# /, "") ?? "",
    sourcePath: relative(root, file),
    text
  });
}

await mkdir(join(root, "site", "data"), { recursive: true });
const artifacts = plugins.flatMap((plugin) => [plugin, ...plugin.componentArtifacts]).concat(documents);
await writeFile(output, `${JSON.stringify({ generatedAt: new Date().toISOString(), artifacts }, null, 2)}\n`);
console.log(`Indexed ${plugins.length} plugins, ${artifacts.length - plugins.length - documents.length} components, and ${documents.length} documents into ${relative(root, output)}.`);
