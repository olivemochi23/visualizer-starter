# Visualizer Starter

Codex app で HTML ビジュアライゼーションを作るためのスターターリポジトリです。
既存の成果物や個人資料は含めず、カテゴリ出力、スライド形式、PDF出力、デザイン参照の仕組みだけを入れています。

## Mac + Codex app で使う

```bash
git clone https://github.com/olivemochi23/visualizer-starter.git
cd visualizer-starter
npm ci
```

Codex app で clone した `visualizer-starter` フォルダを開きます。
PDF出力やスライド検証で Playwright のブラウザが必要な場合は、初回だけ次を実行します。

```bash
npm run install:browser
```

## 使い方

Codex には、作りたいビジュアライゼーションの内容を渡してください。
このプロジェクトでは、出力はカテゴリ配下に作られます。

- `reviews/`: 製品レビュー・比較
- `analysis/`: リスク分析・コスト計算・契約・ビジネス判断
- `personal/`: 人間関係・性格分析・個人ダッシュボード
- `guides/`: ハウツー・スキルガイド・チュートリアル
- `tech/`: 技術図解・ツール比較・アーキテクチャ
- `misc/`: その他

各ビジュアライゼーションは `category/kebab-case-name/index.html` に配置します。

## 同梱している Codex 用コンテキスト

- `AGENTS.md`: Codex が読むプロジェクトルール。
- `.agents/skills/frontend-design/`: HTML/UI の見た目を決めるデザインスキル。
- `.agents/skills/visualizer-slide-site/`: 16:9 全画面スライドと右端プレビューレールの共通スキル。
- `.agents/skills/superpowers/` と `.agents/skills/using-superpowers/`: Superpowers ワークフローの入口。
- `.agents/skills/*`: 計画実行、TDD、デバッグ、レビュー、ブランチ完了などの Superpowers 関連スキル。
- `vendor/awesome-design-md/`: VoltAgent `awesome-design-md` の DESIGN.md 参照資料。

ブランドやプロダクトの視覚言語を参考にしたい場合は、たとえば次のように依頼できます。

```text
Linear っぽい密度と余白を参考に、技術比較のスライドを作って。
必要なら vendor/awesome-design-md/design-md/linear.app/DESIGN.md を読んで。
```

## コマンド

```bash
npm run generate:index
npm run validate:slides -- path/to/index.html
npm run export:pdf -- path/to/visualization
npx prettier --write path/to/index.html
```

## Gitに入れないもの

`inbox/`、`exports/`、`node_modules/`、`.claude/worktrees/` はローカル作業用です。
このスターターには既存のビジュアライゼーション成果物や個人資料は含めません。
