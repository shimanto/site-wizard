#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ROOT_DIR, loadEnv } from './env.mjs'
import { ask, askChoice, askBool, close } from './prompts.mjs'
import { generatePassword, generateSlug } from './password.mjs'
import { generateImage, buildHeroPrompt, buildOgpPrompt } from './gemini.mjs'
import { createPagesProject } from './cloudflare.mjs'

loadEnv()

const CONFIG_PATH = path.join(ROOT_DIR, 'site.config.json')
const OUTPUT_DIR = path.join(ROOT_DIR, 'wizard-output')
const PUBLIC_DIR = path.join(ROOT_DIR, 'public')

function banner() {
  console.log('')
  console.log('==============================================')
  console.log(' Site Wizard — 案件サイトセットアップ')
  console.log('==============================================')
  console.log('')
  console.log('対話で site.config.json を生成します。')
  console.log('いつでも Ctrl+C で中断できます。')
  console.log('')
}

async function main() {
  banner()

  const existing = existsSync(CONFIG_PATH)
    ? JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'))
    : {}

  // 1) ブランド
  console.log('◆ 1/6  事業・ブランド')
  const brandName = await ask('  事業名', existing.brand?.name || '')
  const shortName = await ask('  ブランド略称(英字推奨)', existing.brand?.shortName || brandName.toUpperCase().replace(/\s+/g, ''))
  const tagline = await ask('  キャッチコピー(一言)', existing.brand?.tagline || '')
  const description = await ask('  説明文(2-3行)', existing.brand?.description || '')
  const primaryColor = await ask('  ブランドカラー(HEX #rrggbb)', existing.brand?.primaryColor || '#0ea5e9')

  // 2) プロジェクト
  console.log('\n◆ 2/6  プロジェクト識別子')
  const defaultSlug = existing.projectName || generateSlug(shortName || brandName)
  const projectName = (await ask('  プロジェクト slug (小文字英数-)', defaultSlug)) || defaultSlug
  const slug = generateSlug(projectName)
  if (slug !== projectName) {
    console.log(`  ※ slug正規化: ${projectName} → ${slug}`)
  }

  // 3) 公開区分 & パスワード
  console.log('\n◆ 3/6  公開区分')
  const modeLabel = await askChoice(
    '  アクセス制御',
    ['open  — 誰でも閲覧可', 'closed — ID+パスワードで保護'],
    existing.access?.mode === 'closed' ? 'closed — ID+パスワードで保護' : 'open  — 誰でも閲覧可',
  )
  const mode = modeLabel.startsWith('closed') ? 'closed' : 'open'
  let username = ''
  let password = ''
  if (mode === 'closed') {
    username = await ask('  ログインID(英字)', existing.access?.username || 'admin')
    const keepExisting = existing.access?.password
      ? await askBool('  既存パスワードを維持しますか?', true)
      : false
    if (keepExisting) {
      password = existing.access.password
    } else {
      const autoGen = await askBool('  パスワードを自動生成しますか?(推奨)', true)
      password = autoGen ? generatePassword(16) : await ask('  パスワードを入力')
    }
  }

  // 4) ページ構成
  console.log('\n◆ 4/6  有効にするページ(LPは必須)')
  const dashboard = await askBool('  ダッシュボード', existing.pages?.dashboard ?? false)
  const form = await askBool('  お問い合わせフォーム', existing.pages?.form ?? true)
  const documents = await askBool('  資料', existing.pages?.documents ?? false)
  const slides = await askBool('  スライド', existing.pages?.slides ?? false)

  // 5) 連絡先
  console.log('\n◆ 5/6  連絡先(任意)')
  const company = await ask('  会社名', existing.contact?.company || brandName)
  const email = await ask('  メール', existing.contact?.email || '')
  const phone = await ask('  電話', existing.contact?.phone || '')

  // 6) 画像生成
  console.log('\n◆ 6/6  ヒーロー画像')
  const genImage = process.env.GEMINI_API_KEY
    ? await askBool('  Gemini でヒーロー画像を自動生成しますか?', true)
    : false
  if (!process.env.GEMINI_API_KEY) {
    console.log('  (GEMINI_API_KEY 未設定のためスキップ)')
  }

  // === 書き出し ===
  const cfg = {
    projectName: slug,
    brand: {
      name: brandName,
      shortName,
      tagline,
      description,
      primaryColor,
    },
    seo: {
      title: `${brandName} | ${tagline}`.trim().replace(/\s*\|\s*$/, ''),
      description: description || tagline,
      ogImage: '/ogp.png',
    },
    hero: {
      headline: tagline || brandName,
      subheadline: '',
      bullets: existing.hero?.bullets?.length ? existing.hero.bullets : [
        '訴求ポイント1',
        '訴求ポイント2',
        '訴求ポイント3',
      ],
      image: '/hero.png',
      ctaLabel: form ? 'お問い合わせ' : undefined,
      ctaTarget: form ? 'form' : undefined,
    },
    access: {
      mode,
      username,
      password,
    },
    pages: {
      lp: true,
      dashboard,
      form,
      documents,
      slides,
    },
    contact: {
      company,
      email,
      phone,
    },
  }

  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2) + '\n', 'utf-8')
  console.log(`\n✅ site.config.json を書き出しました`)

  // ユニークPWを別ファイルに(gitignore)
  if (mode === 'closed') {
    mkdirSync(OUTPUT_DIR, { recursive: true })
    const credPath = path.join(OUTPUT_DIR, `${slug}.credentials.txt`)
    writeFileSync(
      credPath,
      [
        `# ${brandName} (${slug})`,
        `URL:      https://${slug}.pages.dev`,
        `Username: ${username}`,
        `Password: ${password}`,
        '',
        '※ この情報は gitignore 対象です。必要な方にのみ安全な手段で共有してください。',
      ].join('\n') + '\n',
      'utf-8',
    )
    console.log(`🔐 認証情報: ${path.relative(ROOT_DIR, credPath)}`)
    console.log(`   Username: ${username}`)
    console.log(`   Password: ${password}`)
  }

  // 画像生成
  if (genImage) {
    mkdirSync(PUBLIC_DIR, { recursive: true })
    try {
      console.log('\n🎨 hero.png を生成中...')
      const t0 = Date.now()
      const hero = await generateImage(
        buildHeroPrompt({ brandName, tagline, description, primaryColor }),
      )
      writeFileSync(path.join(PUBLIC_DIR, 'hero.png'), hero.buffer)
      console.log(`   ✅ ${Math.round(hero.buffer.length / 1024)}KB / ${Date.now() - t0}ms`)

      await new Promise((r) => setTimeout(r, 2000))

      console.log('🎨 ogp.png を生成中...')
      const t1 = Date.now()
      const ogp = await generateImage(
        buildOgpPrompt({ brandName, tagline, primaryColor }),
      )
      writeFileSync(path.join(PUBLIC_DIR, 'ogp.png'), ogp.buffer)
      console.log(`   ✅ ${Math.round(ogp.buffer.length / 1024)}KB / ${Date.now() - t1}ms`)
    } catch (err) {
      console.log(`   ⚠️  画像生成に失敗: ${err.message}`)
      console.log('   (サイトは既定プレースホルダで動作します。後で pnpm gen:hero で再実行可)')
    }
  }

  // Cloudflare Pages プロジェクト作成
  console.log('\n☁️  Cloudflare Pages プロジェクト作成')
  const cf = createPagesProject(slug)
  if (cf.skipped) {
    console.log(`   (スキップ) ${cf.reason}`)
  } else if (cf.ok) {
    console.log(cf.alreadyExists ? `   ℹ️  既に存在 (${slug}.pages.dev)` : `   ✅ 作成完了 → ${slug}.pages.dev`)
  } else {
    console.log(`   ⚠️  失敗: ${(cf.error || '').slice(0, 300)}`)
  }

  console.log('\n==============================================')
  console.log(' セットアップ完了')
  console.log('==============================================')
  console.log('')
  console.log('次のコマンドで確認・デプロイ:')
  console.log('  pnpm dev         # ローカルプレビュー')
  console.log('  pnpm build       # ビルド確認')
  console.log('  git add -A && git commit -m "setup: ' + slug + '"')
  console.log('  git push origin main   # → 自動デプロイ')
  console.log('')
  console.log(`公開URL: https://${slug}.pages.dev`)
  if (mode === 'closed') {
    console.log('※ CLOSED: wizard-output/*.credentials.txt を参照')
  }

  close()
}

main().catch((err) => {
  console.error('\n💥 エラー:', err.message)
  close()
  process.exit(1)
})
