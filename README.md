# site-wizard

> 相談 → ヒアリング → 案件サイト公開までをウィザードで一気通貫。

案件サイト（LP + 任意の各種ページ）を、対話入力だけで Cloudflare Pages の `{slug}.pages.dev` に立ち上げるためのテンプレートリポジトリです。GitHub Template として子リポジトリに複製し、`pnpm wizard` を実行するだけで案件ごとの設定・認証情報・画像・デプロイを自動生成します。

## 特徴

- **CLIウィザード** — 対話入力で `site.config.json` を生成
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

```bash
# 1) テンプレートから子リポ作成
gh repo create shimanto/{案件slug} --template shimanto/site-wizard --private --clone
cd {案件slug}

# 2) .env を準備（GEMINI_API_KEY / CLOUDFLARE_* を設定）
cp .env.example .env
#  → エディタで埋める

# 3) ウィザード実行
pnpm install
pnpm wizard

# 4) コミット & プッシュ（自動デプロイ）
git add -A && git commit -m "setup" && git push
```

## ライセンス

Internal use only.
