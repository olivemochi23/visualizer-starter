# Print / PDF Fidelity Pattern

スライドHTMLをPDF出力したときにオリジナルのレイアウトが崩れないようにするための実装パターン。

## 目次

- [なぜ必要か](#なぜ必要か)
- [必須ステップ](#必須ステップ)
- [レイアウトパターン別テンプレート](#レイアウトパターン別テンプレート) — centered / prose / 2col / contrast / grid / flex
- [印刷で問題が出るCSSプロパティ](#印刷で問題が出るcssプロパティ)
- [共通の印刷ベース](#共通の印刷ベース)
- [チェックリスト](#チェックリスト)

## なぜ必要か

ブラウザの印刷エンジンはスクリーン用CSSを解釈する際に一部のプロパティを無視・変更する。特にgrid/flexの横並びレイアウトが縦積みに崩壊しやすい。共有CSS（`shared/slide-pdf-export.css`）はページ枠とUI非表示のみ担当するため、各スライドのレイアウト保全は個別HTMLの `@media print` ブロックで行う。

## 必須ステップ

1. スライドHTMLの全スタイルを書き終えた後、使用した**全てのレイアウトクラス**をリストアップする
2. 各レイアウトクラスに対して `@media print` 内で以下のプロパティを `!important` 付きで再宣言する:
   - `display` (grid / flex)
   - `grid-template-columns` / `grid-template-rows`
   - `flex-direction`
   - `gap`
   - `position` (absolute配置のもの)
   - `inset` / `top` / `left` / `right` / `bottom`
   - `width` / `height` / `min-height`
   - `padding`
3. `@page { size: landscape; margin: 0; }` を宣言する（共有CSS側にもあるが、インラインで補強しておくと安全）

## レイアウトパターン別テンプレート

### フルスクリーン中央配置（breath / centered）

```css
@media print {
  .breath {
    position: absolute !important;
    inset: 0 !important;
    padding: 8% 12% !important;
  }
}
```

### プローズ（1カラムテキスト）

```css
@media print {
  .prose-wrap {
    position: absolute !important;
    inset: 0 !important;
    padding: 8% 14% 8% 8% !important;
  }
}
```

### 2カラム横並び（grid）

```css
@media print {
  .two-col {
    position: absolute !important;
    inset: 0 !important;
    display: grid !important;
    grid-template-columns: 1.1fr 0.9fr !important;
  }
  .col-left {
    padding: 7% 4% 7% 6% !important;
  }
  .col-right {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 6% !important;
    border-top: none !important;
    border-left: 1px solid var(--border) !important;
  }
}
```

### 対比カラム（均等2分割）

```css
@media print {
  .contrast-col {
    position: absolute !important;
    inset: 0 !important;
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
  }
  .contrast-side {
    padding: 7% 5% !important;
  }
  .contrast-side:first-child {
    border-bottom: none !important;
    border-right: 1px solid var(--border) !important;
  }
}
```

### マルチカラムグリッド

```css
@media print {
  .card-grid {
    display: grid !important;
    grid-template-columns: repeat(3, 1fr) !important;
  }
}
```

### Flexbox横並び

```css
@media print {
  .row-layout {
    display: flex !important;
    flex-direction: row !important;
    gap: 2rem !important;
  }
}
```

## 印刷で問題が出るCSSプロパティ

| プロパティ                  | 問題                     | 対策                               |
| --------------------------- | ------------------------ | ---------------------------------- |
| `backdrop-filter`           | 印刷エンジンが無視       | 実背景色をfallbackで指定           |
| `mix-blend-mode`            | 印刷エンジンが無視       | 印刷時は `normal` に               |
| `filter: blur()`            | 装飾が消える、または重い | `opacity` を下げるか非表示に       |
| `position: fixed`           | 印刷では static 扱い     | `absolute` に変更                  |
| `vh` / `vw` 単位            | 印刷ページサイズと不一致 | `%` や固定値で再指定               |
| `overflow: hidden` on slide | 内容が見切れる           | 印刷時に内容量を確認               |
| `box-shadow` (大きい値)     | 一部ブラウザで消える     | `print-color-adjust: exact` で補助 |
| `scroll-snap-*`             | 不要                     | 共有CSSが解除済み                  |

## 共通の印刷ベース

全スライドHTMLの `@media print` ブロックに含めるべき共通ルール:

```css
@media print {
  *,
  *::before,
  *::after {
    animation: none !important;
    transition: none !important;
  }
  html,
  body {
    height: auto !important;
    overflow: visible !important;
    scroll-snap-type: none !important;
    background: #fff !important;
  }
  .slide {
    width: 100vw !important;
    height: 100vh !important;
    min-height: 100vh !important;
    scroll-snap-align: none !important;
    page-break-after: always;
    break-after: page;
    overflow: hidden !important;
  }
  .slide:last-of-type {
    page-break-after: avoid;
    break-after: avoid;
  }
  .slide-preview-rail,
  .pdf-export-rail {
    display: none !important;
  }
}
@page {
  size: landscape;
  margin: 0;
}
```

この共通ベースの後に、そのHTML固有のレイアウトクラスに対する `@media print` ルールを追加する。

## チェックリスト

- [ ] 全レイアウトクラスに `@media print` ルールがある
- [ ] grid/flex の `display` と列定義が `!important` で再宣言されている
- [ ] `backdrop-filter` を使う要素に実背景色のfallbackがある
- [ ] 装飾用 `filter: blur()` は印刷時にopacity低下または非表示
- [ ] `position: fixed` は印刷時に `absolute` に変更
- [ ] Ctrl+P の印刷プレビューで全スライドの横並びレイアウトが維持されている
- [ ] テキストの見切れがない
