import fs from "node:fs";
import fsp from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_VIEWPORT = { width: 1600, height: 900 };
const DEFAULT_WAIT_MS = 450;
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");

function printUsage() {
  console.log(`Usage:
  npm run export:pdf -- <target> [--out-dir <dir>] [--width <px>] [--height <px>] [--wait-ms <ms>] [--selector <css>]

Examples:
  npm run export:pdf -- personal/relationship-atlas
  npm run export:pdf -- personal/enfp-intp-relationship-diagnosis -- --out-dir exports/custom
  npm run export:pdf -- personal/relationship-atlas/index.html -- --width 1920 --height 1080
`);
}

function parseArgs(argv) {
  const options = {
    selector: ".slide",
    waitMs: DEFAULT_WAIT_MS,
    width: DEFAULT_VIEWPORT.width,
    height: DEFAULT_VIEWPORT.height,
  };
  const positionals = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--") {
      continue;
    }

    if (token === "--help" || token === "-h") {
      options.help = true;
      continue;
    }

    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }

    const [rawKey, inlineValue] = token.slice(2).split("=", 2);
    const key = rawKey.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    const value = inlineValue ?? argv[index + 1];

    if (value == null) {
      throw new Error(`オプション --${rawKey} に値が必要です。`);
    }

    options[key] = value;
    if (inlineValue == null) {
      index += 1;
    }
  }

  if (positionals[0]) {
    options.target = positionals[0];
  }

  options.width = Number(options.width);
  options.height = Number(options.height);
  options.waitMs = Number(options.waitMs);

  if (!Number.isFinite(options.width) || options.width <= 0) {
    throw new Error("--width は正の数値で指定してください。");
  }

  if (!Number.isFinite(options.height) || options.height <= 0) {
    throw new Error("--height は正の数値で指定してください。");
  }

  if (!Number.isFinite(options.waitMs) || options.waitMs < 0) {
    throw new Error("--wait-ms は 0 以上の数値で指定してください。");
  }

  return options;
}

function assertInsideRepo(targetPath) {
  const relative = path.relative(repoRoot, targetPath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`リポジトリ外のパスは指定できません: ${targetPath}`);
  }
}

async function resolveTargetFile(targetArg) {
  const resolved = path.resolve(repoRoot, targetArg);
  assertInsideRepo(resolved);

  const stats = await fsp.stat(resolved).catch(() => null);
  if (!stats) {
    throw new Error(`対象が見つかりません: ${targetArg}`);
  }

  if (stats.isDirectory()) {
    const indexPath = path.join(resolved, "index.html");
    const indexStats = await fsp.stat(indexPath).catch(() => null);
    if (!indexStats?.isFile()) {
      throw new Error(`index.html が見つかりません: ${targetArg}`);
    }
    return indexPath;
  }

  if (stats.isFile()) {
    if (path.extname(resolved).toLowerCase() !== ".html") {
      throw new Error(`HTML ファイルを指定してください: ${targetArg}`);
    }
    return resolved;
  }

  throw new Error(`対象を解決できませんでした: ${targetArg}`);
}

function defaultOutputDirFor(targetFile) {
  const fileName = path.parse(targetFile).name;
  const folderName = path.basename(path.dirname(targetFile));
  const outputName =
    fileName === "index" ? folderName : `${folderName}-${fileName}`;
  return path.join(repoRoot, "exports", outputName);
}

function sanitizeFileName(value) {
  return (
    value
      .normalize("NFKC")
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
      .replace(/\s+/g, "-")
      .replace(/\.+$/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "slide"
  );
}

function contentTypeFor(filePath) {
  return (
    MIME_TYPES[path.extname(filePath).toLowerCase()] ??
    "application/octet-stream"
  );
}

async function startStaticServer(rootDir) {
  const server = http.createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
      const relativePath = decodeURIComponent(requestUrl.pathname);
      const requestedPath = path.resolve(rootDir, `.${relativePath}`);

      assertInsideRepo(requestedPath);

      let filePath = requestedPath;
      const stats = await fsp.stat(filePath).catch(() => null);

      if (!stats) {
        response.writeHead(404, {
          "content-type": "text/plain; charset=utf-8",
        });
        response.end("Not found");
        return;
      }

      if (stats.isDirectory()) {
        filePath = path.join(filePath, "index.html");
      }

      const fileStats = await fsp.stat(filePath).catch(() => null);
      if (!fileStats?.isFile()) {
        response.writeHead(404, {
          "content-type": "text/plain; charset=utf-8",
        });
        response.end("Not found");
        return;
      }

      response.writeHead(200, {
        "content-length": fileStats.size,
        "content-type": contentTypeFor(filePath),
      });
      fs.createReadStream(filePath).pipe(response);
    } catch (error) {
      response.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
      response.end(error instanceof Error ? error.message : "Forbidden");
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("ローカルサーバーの起動に失敗しました。");
  }

  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      }),
  };
}

async function ensurePlaywright() {
  try {
    return await import("playwright");
  } catch {
    throw new Error(
      "playwright が未インストールです。`npm install` の後に `npm run install:browser` を実行してください。",
    );
  }
}

async function waitForFonts(page) {
  await page.evaluate(async () => {
    if ("fonts" in document) {
      await document.fonts.ready;
    }
  });
}

async function readSlideMetadata(page, selector) {
  return page.evaluate((slideSelector) => {
    const cleanText = (value) => (value ?? "").replace(/\s+/g, " ").trim();
    return Array.from(document.querySelectorAll(slideSelector)).map(
      (slide, index) => {
        const heading = slide.querySelector("h1, h2, h3");
        const title =
          cleanText(slide.getAttribute("data-slide-title")) ||
          cleanText(heading?.textContent) ||
          cleanText(slide.id) ||
          `slide-${String(index + 1).padStart(2, "0")}`;

        return {
          id: slide.id || "",
          index,
          title,
        };
      },
    );
  }, selector);
}

async function activateSlideForExport(page, selector, slideIndex, waitMs) {
  return page.evaluate(
    async ({ slideSelector, targetIndex, delayMs }) => {
      const EXPORT_CLASS = "slide-pdf-export";
      const STYLE_ID = "slide-pdf-export-style";
      const slides = Array.from(document.querySelectorAll(slideSelector));
      const slide = slides[targetIndex];

      if (!slide) {
        throw new Error(`slide index ${targetIndex} が見つかりません。`);
      }

      document.documentElement.classList.remove(EXPORT_CLASS);
      document.documentElement.style.removeProperty("--slide-export-width");
      document.documentElement.style.removeProperty("--slide-export-height");
      slides.forEach((item) => {
        item.removeAttribute("data-slide-export-active");
      });

      document.documentElement.style.scrollBehavior = "auto";
      document.body.style.scrollBehavior = "auto";

      slide.scrollIntoView({ block: "start", inline: "nearest" });
      window.dispatchEvent(new Event("scroll"));

      await new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });

      if (delayMs > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, delayMs));
      }

      const rect = slide.getBoundingClientRect();
      const width = Math.max(1, Math.ceil(rect.width));
      const height = Math.max(1, Math.ceil(rect.height));

      let styleTag = document.getElementById(STYLE_ID);
      if (!styleTag) {
        styleTag = document.createElement("style");
        styleTag.id = STYLE_ID;
        styleTag.textContent = `
          html.${EXPORT_CLASS}, html.${EXPORT_CLASS} body {
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: auto !important;
            overflow: hidden !important;
            background: transparent !important;
          }

          html.${EXPORT_CLASS} *,
          html.${EXPORT_CLASS} *::before,
          html.${EXPORT_CLASS} *::after {
            animation: none !important;
            transition: none !important;
            caret-color: transparent !important;
          }

          html.${EXPORT_CLASS} .slide-preview-rail {
            display: none !important;
          }

          html.${EXPORT_CLASS} ${slideSelector} {
            display: none !important;
            width: var(--slide-export-width) !important;
            height: var(--slide-export-height) !important;
            min-height: 0 !important;
            max-height: none !important;
            margin: 0 !important;
            overflow: hidden !important;
            break-after: auto !important;
            page-break-after: auto !important;
            scroll-snap-align: none !important;
          }

          html.${EXPORT_CLASS} ${slideSelector}[data-slide-export-active="true"] {
            display: block !important;
          }

          @page {
            size: var(--slide-export-width) var(--slide-export-height);
            margin: 0;
          }
        `;
        document.head.append(styleTag);
      }

      document.documentElement.classList.add(EXPORT_CLASS);
      document.documentElement.style.setProperty(
        "--slide-export-width",
        `${width}px`,
      );
      document.documentElement.style.setProperty(
        "--slide-export-height",
        `${height}px`,
      );

      slides.forEach((item, index) => {
        item.setAttribute(
          "data-slide-export-active",
          String(index === targetIndex),
        );
      });

      return { width, height };
    },
    { delayMs: waitMs, slideSelector: selector, targetIndex: slideIndex },
  );
}

function toRepoRelative(targetPath) {
  return path.relative(repoRoot, targetPath).split(path.sep).join("/");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help || !options.target) {
    printUsage();
    process.exit(options.help ? 0 : 1);
  }

  const targetFile = await resolveTargetFile(options.target);
  const outputDir = options.outDir
    ? path.resolve(repoRoot, options.outDir)
    : defaultOutputDirFor(targetFile);

  assertInsideRepo(outputDir);
  await fsp.mkdir(outputDir, { recursive: true });

  const { chromium } = await ensurePlaywright();
  const server = await startStaticServer(repoRoot);
  const browser = await chromium.launch();

  try {
    const context = await browser.newContext({
      deviceScaleFactor: 2,
      screen: {
        height: options.height,
        width: options.width,
      },
      viewport: {
        height: options.height,
        width: options.width,
      },
    });

    const page = await context.newPage();
    await page.emulateMedia({ media: "screen" });

    const targetUrl = `${server.origin}/${toRepoRelative(targetFile)}`;
    await page.goto(targetUrl, { waitUntil: "networkidle" });
    await waitForFonts(page);

    const slides = await readSlideMetadata(page, options.selector);
    if (!slides.length) {
      throw new Error(
        `セレクタ ${options.selector} に一致するスライドがありません。`,
      );
    }

    console.log(
      `Exporting ${slides.length} slides from ${toRepoRelative(targetFile)}`,
    );

    for (const slide of slides) {
      const { width, height } = await activateSlideForExport(
        page,
        options.selector,
        slide.index,
        options.waitMs,
      );

      const safeName = sanitizeFileName(
        `${String(slide.index + 1).padStart(2, "0")}-${slide.id || slide.title}`,
      );
      const pdfPath = path.join(outputDir, `${safeName}.pdf`);

      await page.pdf({
        height: `${height}px`,
        margin: { bottom: "0", left: "0", right: "0", top: "0" },
        path: pdfPath,
        preferCSSPageSize: true,
        printBackground: true,
        width: `${width}px`,
      });

      console.log(`  [ok] ${path.relative(repoRoot, pdfPath)}`);
    }

    console.log(`Done: ${path.relative(repoRoot, outputDir)}`);
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
