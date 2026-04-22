# USAGE — 案件サイトの立ち上げ手順

## 0. 事前準備（1回だけ）

組織 Secrets として下記を GitHub の `shimanto` organization または個別リポジトリに設定しておくと、以降は毎回設定不要です。

| Secret | 用途 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Pages デプロイ用トークン（権限: Pages:Edit） |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID |

ローカル用 `.env` には以下を書きます（`.gitignore` 対象）:

```env
GEMINI_API_KEY=AIza...
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_ACCOUNT_ID=...
```

## 1. 新規案件リポの作成

```bash
gh repo create shimanto/{案件slug} \
  --template shimanto/site-wizard \
  --private \
  --clone

cd {案件slug}
cp .env.example .env
# → .env に GEMINI_API_KEY などを貼る
```

## 2. ウィザード実行

```bash
pnpm install
pnpm wizard
```

対話で聞かれる項目:

1. **事業・ブランド** — 事業名/略称/キャッチ/説明/ブランドカラー
2. **プロジェクト slug** — 公開URL `{slug}.pages.dev` に使用
3. **公開区分** — `open` / `closed`（closedはID+PWで保護）
4. **有効ページ** — LP（必須） / ダッシュボード / フォーム / 資料 / スライド
5. **連絡先** — 会社名・Email・Tel（任意）
6. **ヒーロー画像** — Gemini で自動生成するか

ウィザードは以下を実行します:

- `site.config.json` の書き出し
- CLOSED の場合、16文字のユニークPW自動生成 → `wizard-output/{slug}.credentials.txt` に保存（gitignore）
- Gemini で `public/hero.png` と `public/ogp.png` を生成（任意）
- `wrangler pages project create {slug}` で Cloudflare Pages プロジェクトを作成

## 3. ローカル確認 → デプロイ

```bash
pnpm dev        # http://localhost:5173
pnpm build      # ビルド確認

git add -A
git commit -m "setup: {案件slug}"
git push
# → .github/workflows/deploy.yml が起動して {slug}.pages.dev にデプロイ
```

## 4. CLOSED の認証情報

`wizard-output/{slug}.credentials.txt` にユニークPWが保存されます。このファイルは gitignore 対象ですので、クライアントには Slack / 1Password など安全な手段で共有してください。

## トラブルシュート

### 画像生成が失敗する
`GEMINI_API_KEY` が未設定か無効。`pnpm gen:hero` で再実行可能。スキップしても既定のプレースホルダで動作します。

### Cloudflare Pages プロジェクト作成が失敗する
`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` が未設定。Cloudflare ダッシュボードで手動作成も可（プロジェクト名は `site.config.json` の `projectName` と一致させる）。

### サブドメインを後からカスタムドメインへ
Cloudflare ダッシュボード → Pages プロジェクト → Custom domains から追加。

## 既存案件の再設定

既に `site.config.json` がある状態で `pnpm wizard` を再実行すると、既存値がデフォルトとして提示されます。CLOSED のパスワードは「既存パスワードを維持しますか?」で Y を選ぶと保持されます。
