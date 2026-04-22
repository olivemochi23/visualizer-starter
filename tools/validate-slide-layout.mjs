import fs from "node:fs";
import path from "node:path";

const inputPaths = process.argv.slice(2);

if (inputPaths.length === 0) {
  console.error(
    "Usage: node tools/validate-slide-layout.mjs <slide-html> [more files...]",
  );
  process.exit(1);
}

function findSlideRule(html) {
  return html.match(/\.slide\s*\{([\s\S]*?)\}/);
}

function hasNestedStageMarkup(html) {
  return /<section[^>]*class=["'][^"']*\bslide\b[^"']*["'][^>]*>[\s\S]{0,2000}<div[^>]*class=["'][^"']*\b(stage|slide-inner)\b/i.test(
    html,
  );
}

function collectInnerCanvasClasses(html) {
  const allowedClasses = new Set(["slide", "slide-preview-card"]);
  const matches = [...html.matchAll(/\.([a-z0-9_-]+)\s*\{([^{}]*)\}/gi)];

  return [
    ...new Set(
      matches
        .filter(([, className, body]) => {
          return (
            !allowedClasses.has(className) &&
            /aspect-ratio\s*:\s*16\s*\/\s*9/i.test(body)
          );
        })
        .map((match) => match[1]),
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
