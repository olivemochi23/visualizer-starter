---
name: visualizer-slide-site
description: Create slide-style single-file HTML visualizations in this repo with 16:9 sections, scroll-snap navigation, and the right-edge hover preview rail. Use when the user asks for a deck, presentation, slides, or any visual output that should feel like slide software rather than a normal scrolling page. Even if the user doesn't explicitly say "slides" — if the output would benefit from a paginated, full-screen layout rather than a scrolling page, use this skill. Pair this with the repository's `.agents/skills/frontend-design/SKILL.md` for the visual direction while preserving the shared slide mechanism.
---

# Visualizer Slide Site

このリポジトリ用のスライド形式HTML出力を作成する。

## ワークフロー

1. リポジトリルートの `AGENTS.md` を読む。
2. デザイン判断の前に `.agents/skills/frontend-design/SKILL.md` を読む。
3. 新規スライド出力は `assets/slide-site-template.html` をベースにする。
4. コンテンツに合ったカテゴリフォルダ（`reviews/` `analysis/` `personal/` `guides/` `tech/` `misc/`）配下に kebab-case のフォルダを作り、`index.html` を1ファイルだけ配置する。カテゴリ判定は `AGENTS.md` のルールに従う。
5. プレースホルダーのスライド内容・テーマトークン・レイアウトをリクエストに合わせて差し替える。
6. ユーザーから明示的にインタラクションモデルの変更を求められない限り、スライドナビゲーション機構はそのまま維持する。

## スライド機構の維持

このリポジトリの全スライド出力は共通のプレビューレール機構を共有している。これにより、どのスライドを開いても同じ操作感でナビゲートでき、ユーザーが迷わない。以下のルールはこの一貫性を守るためにある。

- **全画面スライド（`.slide-inner` は使わない）**: 各 `.slide` セクションが `width: 100vw; height: 100vh` のフルスクリーンスライドそのもの。PowerPoint のスライドと同様に、画面全体がスライド面になる。16:9 のカードやボックスを画面内に浮かべるのではなく、**画面そのものが 16:9 のスライドである**。コンテンツは `.slide` に直接配置する。
- **垂直スクロールスナップ**: スライドソフトのような没入感を出すための基本フォーマット。
- **共通クラス名 `.slide-preview-*` を維持**: 複数のスライド出力でCSS/JSを共通化できるよう、クラス名を統一している。独自クラスに変えるとメンテナンスコストが倍増する。
- **右端ホバーターゲットでプレビューパネルを開く**: デスクトップでは画面右端にマウスを寄せるだけで全スライドの一覧にアクセスできる。画面上の邪魔にならず、かつ素早く移動できるバランスが設計意図。
- **プレビューリストのホイール入力を独立させる**: プレビューパネル上でホイールスクロールしたときにページ全体が動くと、ユーザーが意図しないスライド移動が発生してUXが壊れる。`wheel` イベントを `preventDefault` してリスト内スクロールに限定する。
- **ArrowUp / ArrowDown / PageUp / PageDown のキーボードナビ**: マウスを使わないユーザーやプレゼンテーション時のリモコン操作に対応するため。
- **モバイルフォールバック**: タッチデバイスではホバーパネルが使えないため、コンパクトなドットナビゲーターに切り替える。`@media screen and (hover: none)` で分岐し、`@media print` に影響しないようにする。
- **プレビューカードのホバーリフト用余白**: カードが左にスライドするホバーエフェクトがパネル端でクリップされないよう、リスト側に左パディングを確保する。

## プレビューメタデータ

各スライドに明示的なメタデータを付与する:

- `data-slide-title`
- `data-slide-kicker`
- `data-slide-summary`

メタデータがない場合、ナビゲーションスクリプトは見出しや段落テキストにフォールバックするが、明示メタデータの方がプレビューカードの表示が安定してきれいになる。

## デザインルール

- ビジュアルの方向性・タイポグラフィ・モーション・コンポジションは `frontend-design` スキルに委ねる。スライド機構はあくまでインフラであり、デザインそのものではない。
- 色・余白・書体・装飾・各スライドの構成は自由に変えてよい。
- 全スライドを同じレイアウトの繰り返しにしない。視覚的なリズムのある「本物のデッキ」を作る。

## リソース

- `references/slide-preview-pattern.md` — プレビューレール機構の構造・振る舞い契約と実装チェックリスト。レール周りの実装で迷ったときに参照する。
- `assets/slide-site-template.html` — 新規スライド出力のスキャフォールド。必ずここから始める。
- `vendor/awesome-design-md/design-md/<brand>/DESIGN.md` — ブランドやプロダクトの視覚言語を参考にしたい場合のデザイン資料。

## Print / PDF Fidelity

スライドHTMLをPDF出力したとき、画面上のレイアウトがそのまま再現されるように `@media print` ブロックを書く。共有CSS（`shared/slide-pdf-export.css`）はページ枠とUI非表示のみ担当するため、レイアウト保全は各HTML内で行う。

1. スライドの全スタイルを書き終えた後、使用した**全レイアウトクラス**をリストアップする。
2. 各レイアウトクラスに対して `@media print` 内で `display`, `grid-template-columns`, `flex-direction`, `position`, `inset`, `padding` 等を `!important` で再宣言する。
3. `backdrop-filter` を使う要素には実背景色のfallbackを書く。装飾用 `filter: blur()` は印刷時にopacity低下か非表示にする。
4. `@page { size: landscape; margin: 0; }` を宣言する。

パターン別のテンプレートと問題プロパティの対策表は `references/print-fidelity-pattern.md` を参照。新しいレイアウトパターンを作ったときはこのリファレンスのテンプレートに倣って print CSS を追加する。

## 最終チェック

- プレビューレールがスムーズに開閉する
- アクティブなプレビューアイテムが現在のスライドに追従する
- プレビューパネル上のホイールスクロールでページ全体が動かない
- ホバー/フォーカスのリフトエフェクトでプレビューカードがクリップされない
- デッキで使用した全レイアウトクラスに `@media print` ルールがある
- 環境ルールに従い Prettier でフォーマット済み
