import fs from "node:fs";
import path from "node:path";

const inputPaths = process.argv.slice(2);

if (inputPaths.length === 0) {
  console.error(
    "Usage: node tools/validate-slide-layout.mjs <slide-html> [more files...]",
  );
  process.exit(1);
}

function collectStyleText(html) {
  return [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)]
    .map(([, css]) => css)
    .join("\n");
}

function findSlideRule(html) {
  return collectStyleText(html).match(/\.slide\s*\{([\s\S]*?)\}/);
}

function collectCssRules(html) {
  return [...collectStyleText(html).matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(
    ([, selector, body]) => ({
      selector: selector.trim(),
      body,
    }),
  );
}

function selectorTargetsSlide(selector) {
  return selector
    .split(",")
    .some((part) => /\.slide(?![-\w])/i.test(part.trim()));
}

function hasPdfExportStylesheet(html) {
  return /<link\b[^>]*\bhref=["'][^"']*shared\/slide-pdf-export\.css["'][^>]*>/i.test(
    html,
  );
}

function hasPdfExportScript(html) {
  return /<script\b[^>]*\bsrc=["'][^"']*shared\/slide-pdf-export\.js["'][^>]*>/i.test(
    html,
  );
}

function collectSlideHeightAutoRules(html) {
  return collectCssRules(html)
    .filter(({ selector, body }) => {
      return (
        selectorTargetsSlide(selector) && /\bheight\s*:\s*auto\b/i.test(body)
      );
    })
    .map(({ selector }) => selector);
}

function findCssRule(html, selectorPattern) {
  return collectCssRules(html).find(({ selector }) =>
    selectorPattern.test(selector),
  );
}

function hasNestedStageMarkup(html) {
  return /<section[^>]*class=["'][^"']*\bslide\b[^"']*["'][^>]*>[\s\S]{0,2000}<div[^>]*class=["'][^"']*\b(stage|slide-inner)\b/i.test(
    html,
  );
}

function collectInnerCanvasClasses(html) {
  const allowedClasses = new Set(["slide", "slide-preview-card"]);

  return [
    ...new Set(
      collectCssRules(html)
        .flatMap(({ selector, body }) => {
          const classNames = [
            ...selector.matchAll(/\.([a-z0-9_-]+)(?![a-z0-9_-])/gi),
          ].map(([, className]) => className);
          return classNames.map((className) => ({ body, className }));
        })
        .filter(({ className, body }) => {
          return (
            !allowedClasses.has(className) &&
            /aspect-ratio\s*:\s*16\s*\/\s*9/i.test(body)
          );
        })
        .map(({ className }) => className),
    ),
  ];
}

function validateFile(filePath) {
  const absolutePath = path.resolve(filePath);
  const html = fs.readFileSync(absolutePath, "utf8");
  const issues = [];

  const slideRule = findSlideRule(html);
  if (!slideRule) {
    issues.push("`.slide` のCSSルールが見つかりません。");
  } else {
    const body = slideRule[1];
    if (!/width\s*:\s*100vw/i.test(body)) {
      issues.push("`.slide` に `width: 100vw` がありません。");
    }
    if (!/height\s*:\s*100vh/i.test(body)) {
      issues.push("`.slide` に `height: 100vh` がありません。");
    }
  }

  const htmlRule = findCssRule(html, /^html$/i);
  if (
    !htmlRule ||
    !/height\s*:\s*100%/i.test(htmlRule.body) ||
    !/overflow\s*:\s*hidden/i.test(htmlRule.body)
  ) {
    issues.push(
      "`html` に `height: 100%` と `overflow: hidden` がありません。",
    );
  }

  const bodyRule = findCssRule(html, /^body$/i);
  if (
    !bodyRule ||
    !/height\s*:\s*100%/i.test(bodyRule.body) ||
    !/overflow-y\s*:\s*scroll/i.test(bodyRule.body) ||
    !/scroll-snap-type\s*:\s*y\s+mandatory/i.test(bodyRule.body)
  ) {
    issues.push(
      "`body` が `height: 100%` / `overflow-y: scroll` / `scroll-snap-type: y mandatory` のスクロールコンテナになっていません。",
    );
  }

  const slideHeightAutoRules = collectSlideHeightAutoRules(html);
  if (slideHeightAutoRules.length > 0) {
    issues.push(
      "`.slide` を対象にした `height: auto` が見つかりました: " +
        slideHeightAutoRules.join(", "),
    );
  }

  if (!hasPdfExportStylesheet(html)) {
    issues.push("`shared/slide-pdf-export.css` が読み込まれていません。");
  }

  if (!hasPdfExportScript(html)) {
    issues.push("`shared/slide-pdf-export.js` が読み込まれていません。");
  }

  if (hasNestedStageMarkup(html)) {
    issues.push(
      "`.slide` 直下に `.stage` / `.slide-inner` があり、内側キャンバス化しています。",
    );
  }

  const innerCanvasClasses = collectInnerCanvasClasses(html);
  if (innerCanvasClasses.length > 0) {
    issues.push(
      `プレビューカード以外で 16:9 固定の内側コンテナが見つかりました: ${innerCanvasClasses.map((name) => `.${name}`).join(", ")}`,
    );
  }

  return { absolutePath, issues };
}

const results = inputPaths.map(validateFile);
const failed = results.filter((result) => result.issues.length > 0);

for (const result of results) {
  if (result.issues.length === 0) {
    console.log(`PASS ${result.absolutePath}`);
    continue;
  }

  console.error(`FAIL ${result.absolutePath}`);
  for (const issue of result.issues) {
    console.error(`  - ${issue}`);
  }
}

if (failed.length > 0) {
  process.exit(1);
}
