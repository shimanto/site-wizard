# site-wizard

> 相談 → ヒアリング → 案件サイト公開までをウィザードで一気通貫。

案件サイト（LP + 任意の各種ページ）を、対話入力だけで Cloudflare Pages の `{slug}.pages.dev` に立ち上げるためのテンプレートリポジトリです。GitHub Template として子リポジトリに複製し、`pnpm wizard` を実行するだけで案件ごとの設定・認証情報・画像・デプロイを自動生成します。

## 特徴

- **CLIウィザード** — 対話入力で `site.config.json` を生成
- **brief駆動の非対話モード** — `brief.md`(箇条書き)を渡せば対話ゼロで構築
- **Claude で LPコピー自動執筆** — キャッチ / 見出し / 訴求3点を `brief.md` のメモから自動生成
- **config駆動** — LP・ログインゲート・ページ構成・ブランドカラーを config から差し替え
- **OPEN / CLOSED** — 公開サイト or sessionStorage 簡易認証を切替
- **ユニークパスワード自動生成** — CLOSEDの場合、案件ごとに16文字のランダムPWを発行
- **Gemini 画像生成** — `nano-banana-pro-preview` でヒーロー/OGP画像を自動生成
- **Cloudflare Pages 自動デプロイ** — GitHub Actions + `wrangler pages deploy`

## 技術スタック

- Vite + React 18 + TypeScript + Tailwind CSS v3
- Cloudflare Pages（GitHub Actions自動デプロイ）
- Gemini API（nano-banana-pro-preview）

## 使い方（概要）

詳細は [`USAGE.md`](./USAGE.md) 参照。

### A. 対話モード

```bash
gh repo create shimanto/{案件slug} --template shimanto/site-wizard --private --clone
cd {案件slug}
cp .env.example .env   # ANTHROPIC_API_KEY / GEMINI_API_KEY / CLOUDFLARE_* を設定
pnpm install
pnpm wizard
git add -A && git commit -m "setup" && git push
```

### B. brief駆動・非対話モード（推奨）

```bash
gh repo create shimanto/{案件slug} --template shimanto/site-wizard --private --clone
cd {案件slug}
cp .env.example .env   # 同上

# brief.md を用意(箇条書きでヒアリング内容を記入)
cp brief.example.md brief.md
# → 編集して name/slug/pages などを記入、メモ欄に業種・差別化などを書く

pnpm install
pnpm wizard --brief brief.md   # Claudeがコピー自動執筆 + 画像生成 + CF Pages作成
git add -A && git commit -m "setup" && git push
```

### C. メモ → brief.md を AI ドラフト

手元にヒアリング自由記述メモしかない場合は、先に brief.md を Claude で自動生成できます:

```bash
pnpm brief hearing.txt   # → brief.md が生成される
# 必要な修正を加えて
pnpm wizard --brief brief.md
```

## ライセンス

Internal use only.
