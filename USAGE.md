# USAGE — 案件サイトの立ち上げ手順

## 0. 事前準備（1回だけ）

組織 Secrets として下記を GitHub の `shimanto` organization または個別リポジトリに設定しておくと、以降は毎回設定不要です。

| Secret | 用途 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Pages デプロイ用トークン（権限: Pages:Edit） |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID |

ローカル用 `.env` には以下を書きます（`.gitignore` 対象）:

```env
GEMINI_API_KEY=AIza...         # Gemini(画像生成用)
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_ACCOUNT_ID=...
```

**Claude Code** は `claude -p` 経由で呼び出すため、既に `claude auth` 済みであれば追加APIキー不要です。未インストールの場合は https://claude.com/claude-code からインストールしてください。

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

### 2-A. 対話モード

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

### 2-B. brief駆動・非対話モード

`brief.md` を用意して、対話なしで一気通貫:

```bash
cp brief.example.md brief.md
# → brief.md を編集(name/slug/access/pages/連絡先と、メモ欄にヒアリング内容)
pnpm install
pnpm wizard --brief brief.md
```

brief駆動モードの動作:

1. `brief.md` を解析（`- key: value` 箇条書き + `##` 以降のメモ）
2. **Claude Code (`claude -p`) をエージェントモードで起動** — brief.md / src/pages / site.config.example.json を自動読み取りし、反復しながらLPコピーを執筆
3. 構造化出力(JSON Schema): tagline / description / headline / subheadline / bullets×3 / heroImagePrompt
4. CLOSED で `password: auto` なら16文字のユニークPWを自動発行
5. `site.config.json` 書き出し → Gemini画像生成(CC生成プロンプト使用) → CF Pages 作成

オプション:

| flag | 意味 |
|---|---|
| `--brief <path>` | brief.md 指定(非対話モード開始) |
| `--no-ai` | Claude Code 呼び出しを無効化(bullets/tagline はブランク or brief記載値) |
| `--no-image` | Gemini 画像生成をスキップ |
| `--no-cloudflare` | wrangler による Pages 作成をスキップ |

### 2-C. 自由記述メモ → brief.md を AI ドラフト

ヒアリング原文しかない状態から、brief.md を Claude に下書きさせるには:

```bash
pnpm brief hearing.txt            # → brief.md に出力
pnpm brief hearing.txt -o x.md    # 出力先指定
cat hearing.txt | pnpm brief -    # stdin から
```

生成された `brief.md` は「推測項目には`?`」が付きます。確認・修正の上、`pnpm wizard --brief brief.md` へ。

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
