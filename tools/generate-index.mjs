import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");

const CATEGORIES = [
  { dir: "reviews", label: "Reviews", desc: "製品レビュー・比較レポート" },
  { dir: "analysis", label: "Analysis", desc: "リスク分析・ビジネス判断" },
  { dir: "personal", label: "Personal", desc: "人間関係・個人ダッシュボード" },
  { dir: "guides", label: "Guides", desc: "ガイド・チュートリアル" },
  { dir: "tech", label: "Tech", desc: "技術図解・ツール比較" },
  { dir: "misc", label: "Misc", desc: "その他" },
];

function extractTitle(htmlPath) {
  try {
    const html = fs.readFileSync(htmlPath, "utf-8");
    const match = html.match(/<title>(.*?)<\/title>/i);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

function scanCategory(category) {
  const catPath = path.join(repoRoot, category.dir);
  if (!fs.existsSync(catPath)) return [];

  const entries = fs.readdirSync(catPath, { withFileTypes: true });
  const items = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const indexPath = path.join(catPath, entry.name, "index.html");
    if (!fs.existsSync(indexPath)) continue;

    const title = extractTitle(indexPath) || entry.name;
    const stat = fs.statSync(indexPath);

    items.push({
      name: entry.name,
      title,
      href: `${category.dir}/${entry.name}/index.html`,
      modified: stat.mtime.toISOString().slice(0, 10),
    });
  }

  items.sort((a, b) => b.modified.localeCompare(a.modified));
  return items;
}

function generateHTML(data) {
  const categoryBlocks = data
    .filter((cat) => cat.items.length > 0)
    .map(
      (cat) => `
      <section class="category" data-category="${cat.dir}">
        <h2>${cat.label} <span class="cat-desc">${cat.desc}</span> <span class="cat-count">${cat.items.length}</span></h2>
        <div class="grid">
          ${cat.items
            .map(
              (item) => `
            <a class="card" href="${item.href}" data-search="${item.title.toLowerCase()} ${item.name.toLowerCase()}">
              <span class="card-title">${item.title}</span>
              <span class="card-meta">${item.name}</span>
              <span class="card-date">${item.modified}</span>
            </a>`,
            )
            .join("")}
        </div>
      </section>`,
    )
    .join("");

  const totalCount = data.reduce((sum, cat) => sum + cat.items.length, 0);

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Visualizer Dashboard</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #0f0f0f; color: #e0e0e0;
    padding: 2rem; max-width: 1200px; margin: 0 auto;
  }
  header { margin-bottom: 2rem; }
  h1 { font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem; }
  .stats { font-size: 0.85rem; color: #888; margin-bottom: 1rem; }
  .search-box {
    width: 100%; padding: 0.6rem 1rem; font-size: 0.95rem;
    background: #1a1a1a; border: 1px solid #333; border-radius: 8px;
    color: #e0e0e0; outline: none; transition: border-color 0.2s;
  }
  .search-box:focus { border-color: #666; }
  .search-box::placeholder { color: #555; }
  .category { margin-bottom: 2rem; }
  .category h2 {
    font-size: 1.1rem; font-weight: 600; margin-bottom: 0.75rem;
    display: flex; align-items: center; gap: 0.5rem;
  }
  .cat-desc { font-size: 0.8rem; color: #666; font-weight: 400; }
  .cat-count {
    font-size: 0.75rem; background: #252525; color: #888;
    padding: 0.15rem 0.5rem; border-radius: 10px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 0.75rem;
  }
  .card {
    display: flex; flex-direction: column; gap: 0.25rem;
    padding: 0.85rem 1rem; background: #1a1a1a; border: 1px solid #252525;
    border-radius: 8px; text-decoration: none; color: inherit;
    transition: background 0.15s, border-color 0.15s;
  }
  .card:hover { background: #222; border-color: #444; }
  .card-title { font-size: 0.9rem; font-weight: 500; color: #f0f0f0; }
  .card-meta { font-size: 0.75rem; color: #666; font-family: monospace; }
  .card-date { font-size: 0.7rem; color: #555; }
  .hidden { display: none; }
  .no-results {
    text-align: center; padding: 3rem; color: #555; font-size: 0.9rem;
  }
</style>
</head>
<body>
<header>
  <h1>Visualizer Dashboard</h1>
  <p class="stats">${totalCount} visualizations</p>
  <input type="text" class="search-box" placeholder="Search..." autofocus />
</header>
<main>
  ${categoryBlocks}
  <p class="no-results hidden">No results found.</p>
</main>
<script>
  const searchBox = document.querySelector('.search-box');
  const cards = document.querySelectorAll('.card');
  const categories = document.querySelectorAll('.category');
  const noResults = document.querySelector('.no-results');

  searchBox.addEventListener('input', () => {
    const q = searchBox.value.toLowerCase().trim();
    let visibleCount = 0;

    cards.forEach(card => {
      const match = !q || card.dataset.search.includes(q);
      card.classList.toggle('hidden', !match);
      if (match) visibleCount++;
    });

    categories.forEach(cat => {
      const hasVisible = cat.querySelector('.card:not(.hidden)');
      cat.classList.toggle('hidden', !hasVisible);
    });

    noResults.classList.toggle('hidden', visibleCount > 0);
  });
</script>
</body>
</html>`;
}

const data = CATEGORIES.map((cat) => ({
  ...cat,
  items: scanCategory(cat),
}));

const html = generateHTML(data);
const outPath = path.join(repoRoot, "index.html");
fs.writeFileSync(outPath, html, "utf-8");

const totalCount = data.reduce((sum, cat) => sum + cat.items.length, 0);
console.log(`Generated ${outPath} with ${totalCount} items.`);
