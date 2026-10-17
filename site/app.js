const REPO = "https://github.com/natata7/dev-digest-ai-marketplace";
const ADD = "/plugin marketplace add natata7/dev-digest-ai-marketplace";
let ref = "main"; // replaced by the indexed commit once the index loads
const KINDS = { marketplace: "Marketplace", plugin: "Plugin", "external-plugin": "External plugin", skill: "Skill", agent: "Agent", command: "Command", hook: "Hook", mcp: "MCP", lsp: "LSP", document: "Document" };

const view = document.querySelector("#view");
const toast = document.querySelector("#toast");
const params = new URLSearchParams(location.search);
const state = { items: [], query: params.get("q") ?? "", kind: params.get("kind") ?? "all" };

const store = {
  get: (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  set: (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} },
};
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const kindLabel = (type) => KINDS[type] ?? type;
const kindColor = (type) => `var(--k-${KINDS[type] ? type : "other"})`;
const sourceUrl = (item) => item.type === "external-plugin"
  ? (item.source?.source === "github" ? `https://github.com/${item.source.repo}` : `${REPO}/blob/${ref}/.claude-plugin/marketplace.json`)
  : `${REPO}/${["plugin", "marketplace"].includes(item.type) ? "tree" : "blob"}/${ref}/${item.sourcePath}`;

let flashTimer;
const flash = (message) => {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => (toast.hidden = true), 2200);
};

// ---- saved list + theme (per-browser) ----
let saved = store.get("dd-saved", []);
const isSaved = (id) => saved.includes(id);
const toggleSaved = (id) => {
  saved = isSaved(id) ? saved.filter((x) => x !== id) : [...saved, id];
  store.set("dd-saved", saved);
  document.querySelector("#saved-count").textContent = saved.length || "";
};
const sun = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const moon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
const themeButton = document.querySelector("#theme");
const paintTheme = () => {
  const dark = document.documentElement.dataset.theme === "dark";
  themeButton.innerHTML = dark ? sun : moon;
  themeButton.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
};
themeButton.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem("dd-theme", next); } catch {}
  paintTheme();
});

// ---- search ----
const score = (item, terms) => {
  let total = 0;
  for (const term of terms) {
    const hit = (item.name.toLowerCase().includes(term) ? 10 : 0) + (item.description.toLowerCase().includes(term) ? 3 : 0) + (item.search.includes(term) ? 1 : 0);
    if (!hit) return 0;
    total += hit;
  }
  return total;
};
const BROWSE_HIDDEN = ["document", "marketplace"]; // reachable via search or their own chip, not the default listing
const filtered = () => {
  const terms = state.query.toLowerCase().split(/\s+/).filter(Boolean);
  return state.items
    .filter((item) => state.kind === "all" ? terms.length > 0 || !BROWSE_HIDDEN.includes(item.type) : item.type === state.kind)
    .map((item) => ({ item, rank: terms.length ? score(item, terms) : 1 }))
    .filter(({ rank }) => rank > 0)
    .sort((a, b) => b.rank - a.rank || a.item.name.localeCompare(b.item.name))
    .map(({ item }) => item);
};

// ---- views ----
const cardHtml = (item, i) => `
  <article class="card" style="animation-delay:${Math.min(i, 12) * 30}ms">
    <div class="row"><span><i class="dot" style="background:${kindColor(item.type)}"></i>${esc(kindLabel(item.type))}</span><span class="muted">${item.version ? "v" + esc(item.version) : ""}</span></div>
    <h3 style="margin:0"><a class="open" href="#/tool/${encodeURIComponent(item.id)}">${esc(item.name)}</a></h3>
    <p>${esc(item.description)}</p>
    <div class="foot-row"><span>${esc(item.author ?? item.parent ?? "")}</span>${item.install ? `<button type="button" class="btn" data-copy="${esc(item.install)}">Copy install</button>` : ""}</div>
  </article>`;

const catalogView = () => {
  const counts = (type) => state.items.filter((i) => type === "all" ? !BROWSE_HIDDEN.includes(i.type) : i.type === type).length;
  const kinds = ["all", ...Object.keys(KINDS).filter((k) => counts(k))];
  view.innerHTML = `
    <section class="wrap hero">
      <p class="eyebrow">// ${counts("all")} tools</p>
      <h1 class="display">Claude Code workflows you can install in one line<span class="cursor" aria-hidden="true"></span></h1>
      <p class="lede">Plugins, skills and agents from one open repository. Search runs in your browser.</p>
      <label class="search"><span class="mono" aria-hidden="true">❯</span><span class="sr-only">Search the catalog</span>
        <input id="q" type="search" value="${esc(state.query)}" placeholder="specification, architecture, research…" autocomplete="off"></label>
      <div class="chips">${kinds.map((k) => `<button type="button" class="chip" data-kind="${k}" aria-pressed="${state.kind === k}">${k === "all" ? "All" : esc(kindLabel(k))} <b>${counts(k)}</b></button>`).join("")}</div>
    </section>
    <section class="wrap" aria-live="polite"><div id="results"></div></section>`;
  paintResults();
  view.querySelector("#q").addEventListener("input", (e) => { state.query = e.target.value; syncUrl(); paintResults(); });
  view.querySelectorAll("[data-kind]").forEach((button) => button.addEventListener("click", () => {
    state.kind = button.dataset.kind;
    syncUrl();
    view.querySelectorAll("[data-kind]").forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
    paintResults();
  }));
};
const paintResults = () => {
  const list = filtered();
  view.querySelector("#results").innerHTML = list.length
    ? `<div class="grid">${list.map(cardHtml).join("")}</div>`
    : `<div class="panel empty"><p class="display" style="font-size:22px">Nothing found</p><p class="muted">Try a different search or clear the filter.</p><button type="button" class="btn primary" id="reset">Reset filters</button></div>`;
  view.querySelector("#reset")?.addEventListener("click", () => { state.query = ""; state.kind = "all"; syncUrl(); catalogView(); });
};
const syncUrl = () => {
  const next = new URL(location);
  next.searchParams.delete("q"); next.searchParams.delete("kind");
  if (state.query) next.searchParams.set("q", state.query);
  if (state.kind !== "all") next.searchParams.set("kind", state.kind);
  history.replaceState(null, "", next);
};

const detailView = (id) => {
  const item = state.items.find((i) => i.id === id);
  if (!item) { view.innerHTML = `<main class="wrap page"><div class="panel empty"><p class="display" style="font-size:22px">Tool not found</p><a class="btn primary" href="#/">Back to catalog</a></div></main>`; return; }
  const parent = item.parent ? state.items.find((i) => i.id === item.parent) : null;
  const children = state.items.filter((i) => i.parent === item.id);
  const related = state.items.filter((i) => i.type === item.type && i.id !== item.id).slice(0, 3);
  const keywords = (item.keywords ?? []).map((k) => `<span class="tag">${esc(k)}</span>`).join("");
  const deps = (item.dependencies ?? []).map((d) => {
    const target = state.items.find((i) => i.type === "plugin" && i.name === d.name);
    const label = `${esc(d.name)}${d.version ? ` <span class="muted">${esc(d.version)}</span>` : ""}`;
    return `<li>${target ? `<a class="open" href="#/tool/${encodeURIComponent(target.id)}">${label}</a>` : label}</li>`;
  }).join("");
  const contents = item.type === "plugin"
    ? (children.length ? children.map((c) => `<li><span class="mono muted" style="font-size:12px">${esc(kindLabel(c.type))}</span><br><a class="open" style="font-size:16px" href="#/tool/${encodeURIComponent(c.id)}">${esc(c.name)}</a><div class="muted" style="font-size:15px;margin-top:4px">${esc(c.description)}</div></li>`).join("") : `<li class="muted">This plugin has no indexed skills, agents or commands.</li>`)
    : `<li><span class="mono" style="font-size:14px">${esc(item.sourcePath)}</span>${item.source ? `<div class="muted" style="margin-top:4px">Source: ${esc(JSON.stringify(item.source))}</div>` : ""}${parent ? `<div class="muted" style="margin-top:4px">Part of <a href="#/tool/${encodeURIComponent(parent.id)}">${esc(parent.name)}</a></div>` : ""}</li>`;
  view.innerHTML = `
    <main class="wrap page">
      <a class="btn" href="#/">← Catalog</a>
      <div class="detail">
        <div class="main">
          <p class="eyebrow"><i class="dot" style="background:${kindColor(item.type)}"></i>${esc(kindLabel(item.type))}${item.version ? " · v" + esc(item.version) : ""}</p>
          <h1 class="display">${esc(item.name)}</h1>
          <p class="muted" style="margin:18px 0 0;font-size:18px;max-width:640px">${esc(item.description)}</p>
          ${item.author ? `<p class="muted" style="margin:14px 0 0;font-size:14px">Author: ${esc(item.author)}</p>` : ""}
          <div class="tabs" role="tablist">
            <button type="button" role="tab" data-tab="overview" aria-selected="true">Overview</button>
            <button type="button" role="tab" data-tab="contents" aria-selected="false">${item.type === "plugin" ? "Contents" : "Source"}</button>
          </div>
          <div class="tabpanel" data-panel="overview">
            ${keywords ? `<div class="tags">${keywords}</div>` : ""}
            ${deps ? `<h2 class="display" style="margin-top:32px;font-size:20px">Dependencies</h2><p class="muted" style="margin:8px 0 0">Installed automatically with this plugin.</p><ul class="list" style="margin-top:12px">${deps}</ul>` : ""}
            ${related.length ? `<h2 class="display" style="margin-top:40px;font-size:20px">Related</h2><div class="grid" style="padding-bottom:0;margin-top:16px;grid-template-columns:repeat(auto-fill,minmax(min(100%,240px),1fr))">${related.map((r) => `<article class="card" style="padding:16px;gap:6px"><span class="mono muted" style="font-size:12px">${esc(kindLabel(r.type))}</span><a class="open" style="font-size:15px" href="#/tool/${encodeURIComponent(r.id)}">${esc(r.name)}</a></article>`).join("")}</div>` : ""}
          </div>
          <div class="tabpanel" data-panel="contents" hidden><ul class="list">${contents}</ul></div>
        </div>
        <aside class="panel">
          ${item.install ? `<div class="muted" style="font-size:14px">1. Add the marketplace (once)</div><code class="cmd">${esc(ADD)}</code><button type="button" class="btn" data-copy="${esc(ADD)}" data-msg="Command copied">Copy add command</button><div class="muted" style="font-size:14px">2. Install</div><code class="cmd">${esc(item.install)}</code><button type="button" class="btn primary" style="min-height:52px" data-copy="${esc(item.install)}">Copy install command</button>` : ""}
          <button type="button" class="btn" id="save"></button>
          <a class="btn" href="${esc(sourceUrl(item))}">View source →</a>
        </aside>
      </div>
    </main>`;
  const saveButton = view.querySelector("#save");
  const paintSave = () => { saveButton.textContent = isSaved(item.id) ? "✓ Saved" : "Save for later"; saveButton.classList.toggle("done", isSaved(item.id)); };
  paintSave();
  saveButton.addEventListener("click", () => { toggleSaved(item.id); paintSave(); flash(isSaved(item.id) ? `Saved: ${item.name}` : `Removed: ${item.name}`); });
  view.querySelectorAll("[data-tab]").forEach((tab) => tab.addEventListener("click", () => {
    view.querySelectorAll("[data-tab]").forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
    view.querySelectorAll("[data-panel]").forEach((p) => (p.hidden = p.dataset.panel !== tab.dataset.tab));
  }));
};

const savedView = () => {
  const list = saved.map((id) => state.items.find((i) => i.id === id)).filter(Boolean);
  view.innerHTML = `
    <main class="wrap page">
      <p class="eyebrow">// saved in this browser · ${list.length}</p>
      <h1 class="display">Saved</h1>
      ${list.length
        ? `<div class="grid" style="margin-top:32px">${list.map(cardHtml).join("")}</div>`
        : `<div class="panel empty" style="margin-top:32px"><p class="display" style="font-size:22px">Nothing saved yet</p><p class="muted">Open a tool and choose “Save for later”.</p><a class="btn primary" href="#/">Browse catalog</a></div>`}
    </main>`;
};

const template = `{
  "name": "my-plugin",
  "description": "What the plugin does and who it is for.",
  "version": "0.1.0",
  "author": { "name": "Your team" },
  "license": "MIT",
  "keywords": ["keyword"]
}`;
const publishView = () => {
  view.innerHTML = `
    <main class="wrap page">
      <p class="eyebrow">// for plugin authors</p>
      <h1 class="display">Publish a plugin</h1>
      <p class="muted" style="margin:16px 0 0;max-width:560px;font-size:18px">Plugins are published through pull requests. Once merged, the catalog rebuilds and deploys automatically.</p>
      <ol class="steps">
        <li><div><strong>Create the plugin folder</strong><p>Add <span class="mono">plugins/my-plugin/</span> with a <span class="mono">.claude-plugin/plugin.json</span> and a README. The folder name must match the manifest name.</p></div></li>
        <li><div><strong>Register it in the marketplace</strong><p>Add an entry to <span class="mono">.claude-plugin/marketplace.json</span>.</p></div></li>
        <li><div><strong>Validate locally</strong><p><span class="mono">claude plugin validate --strict .</span></p></div></li>
        <li><div><strong>Open a pull request</strong><p>See <a href="${REPO}/blob/main/CONTRIBUTING.md">CONTRIBUTING.md</a> and the <a href="${REPO}/blob/main/docs/PLUGIN-GUIDELINES.md">plugin guidelines</a>.</p></div></li>
      </ol>
      <div class="panel" style="margin-top:32px;max-width:720px">
        <div class="muted" style="font-size:14px;margin-bottom:10px">plugin.json template</div>
        <pre class="cmd">${esc(template)}</pre>
        <button type="button" class="btn" style="margin-top:14px" data-copy="${esc(template)}" data-msg="Template copied">Copy template</button>
      </div>
    </main>`;
};

// ---- router ----
const route = () => {
  const [, page = "", arg = ""] = location.hash.split("/");
  document.querySelectorAll("#nav [data-route]").forEach((a) => {
    const on = a.dataset.route === page || (a.dataset.route === "" && page === "tool");
    on ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current");
  });
  if (page === "tool") detailView(decodeURIComponent(arg));
  else if (page === "saved") savedView();
  else if (page === "publish") publishView();
  else catalogView();
  scrollTo(0, 0);
};

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-copy]");
  if (!button) return;
  try { await navigator.clipboard.writeText(button.dataset.copy); flash(button.dataset.msg ?? "Install command copied"); }
  catch { flash("Copy failed — select the text manually"); }
});
window.addEventListener("hashchange", route);

paintTheme();
document.querySelector("#saved-count").textContent = saved.length || "";
fetch("./data/index.json")
  .then((response) => response.json())
  .then((data) => {
    state.items = data.artifacts
      .map((a) => ({ ...a, description: a.description ?? "", search: `${a.keywords?.join(" ") ?? ""} ${a.text ?? ""}`.toLowerCase() }))
      .sort((a, b) => (a.type === "plugin" ? 0 : 1) - (b.type === "plugin" ? 0 : 1) || a.name.localeCompare(b.name));
    ref = data.sourceCommit ?? ref;
    const commit = data.sourceCommit ? ` · ${data.sourceCommit.slice(0, 7)}` : "";
    document.querySelector("#foot-note").textContent = `Static catalog · generated ${data.generatedAt.slice(0, 10)}${commit}`;
    route();
  })
  .catch(() => { view.innerHTML = '<main class="wrap page"><div class="panel empty"><p class="display" style="font-size:22px">Index unavailable</p><p class="muted">Run <span class="mono">node scripts/build-index.mjs</span> and reload.</p></div></main>'; });
