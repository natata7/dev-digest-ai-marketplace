import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const pluginsDir = join(root, "plugins");
const docsDir = join(root, "docs");
const output = join(root, "site", "data", "index.json");

const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));
const marketplacePath = join(root, ".claude-plugin", "marketplace.json");
const textExtensions = [".md", ".json", ".yaml", ".yml", ".txt"];
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
  if (/\/skills\/[^/]+\/SKILL\.md$/.test(file)) return "skill";
  if (/\/agents\/[^/]+\.md$/.test(file)) return "agent";
  if (/\/commands\/[^/]+\.md$/.test(file)) return "command";
  if (/\/hooks\/hooks\.json$/.test(file)) return "hook";
  if (/\/lsp\/[^/]+$/.test(file)) return "lsp";
  if (file.endsWith("/.mcp.json")) return "mcp";
  return "document";
};
const frontmatter = (text, key) => {
  const block = text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
  return block.match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1]?.trim().replace(/^"(.*)"$/, "$1") ?? "";
};

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
    if (textExtensions.some((extension) => file.endsWith(extension))) {
      content.push(await readFile(file, "utf8"));
    }
  }
  const components = files
    .filter((file) => !file.endsWith("plugin.json") && componentType(file) !== "document")
    .map((file) => ({ type: componentType(file), path: relative(root, file) }));
  const componentArtifacts = [];
  for (const file of files.filter((candidate) => ["skill", "agent", "command", "hook", "mcp", "lsp"].includes(componentType(candidate)))) {
    const text = await readFile(file, "utf8");
    const type = componentType(file);
    const fallbackName = type === "skill" ? file.split("/").at(-2) : file.split("/").pop().replace(/\.(md|json|yaml|yml|txt)$/i, "");
    componentArtifacts.push({
      id: `${manifest.name}:${type}:${fallbackName}`,
      name: frontmatter(text, "name") || (type === "hook" ? `${manifest.name} hooks` : fallbackName),
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
for (const file of [join(root, "README.md"), ...(await filesUnder(docsDir))]) {
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

const marketplace = await readJson(marketplacePath);
const marketplaceArtifact = {
  id: `marketplace:${marketplace.name}`,
  name: marketplace.name,
  type: "marketplace",
  description: marketplace.description ?? "",
  sourcePath: ".claude-plugin/marketplace.json",
  text: JSON.stringify(marketplace)
};
const externalArtifacts = (marketplace.plugins ?? [])
  .filter((entry) => typeof entry.source === "object")
  .map((entry) => ({
    id: `${marketplace.name}:external:${entry.name}`,
    name: entry.name,
    type: "external-plugin",
    description: entry.description ?? "External plugin listed by this marketplace.",
    source: entry.source,
    sourcePath: ".claude-plugin/marketplace.json",
    text: JSON.stringify(entry)
  }));

await mkdir(join(root, "site", "data"), { recursive: true });
const artifacts = [marketplaceArtifact, ...externalArtifacts, ...plugins.flatMap((plugin) => [plugin, ...plugin.componentArtifacts]), ...documents];
const index = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  sourceCommit: process.env.SOURCE_COMMIT ?? null,
  artifacts
};
await writeFile(output, `${JSON.stringify(index, null, 2)}\n`);
console.log(`Indexed ${plugins.length} local plugins, ${artifacts.filter((artifact) => ["skill", "agent", "command", "hook", "mcp", "lsp"].includes(artifact.type)).length} components, ${externalArtifacts.length} external plugins, and ${documents.length} documents into ${relative(root, output)}.`);
