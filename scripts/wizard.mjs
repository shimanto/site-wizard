#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { ROOT_DIR, loadEnv } from './env.mjs'
import { ask, askChoice, askBool, close } from './prompts.mjs'
import { generatePassword, generateSlug } from './password.mjs'
import { generateImage, buildHeroPrompt, buildOgpPrompt } from './gemini.mjs'
import { createPagesProject } from './cloudflare.mjs'
import { loadBrief, splitList } from './brief.mjs'
import { draftLpCopy } from './claude.mjs'

loadEnv()

const CONFIG_PATH = path.join(ROOT_DIR, 'site.config.json')
const OUTPUT_DIR = path.join(ROOT_DIR, 'wizard-output')
const PUBLIC_DIR = path.join(ROOT_DIR, 'public')

function parseArgs(argv) {
  const args = { brief: null, nonInteractive: false, noImage: false, noCloudflare: false, noAi: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--brief' || a === '-b') args.brief = argv[++i]
    else if (a.startsWith('--brief=')) args.brief = a.slice('--brief='.length)
    else if (a === '--non-interactive' || a === '-y') args.nonInteractive = true
    else if (a === '--no-image') args.noImage = true
    else if (a === '--no-cloudflare') args.noCloudflare = true
    else if (a === '--no-ai') args.noAi = true
    else if (a === '-h' || a === '--help') args.help = true
  }
  return args
}

function printHelp() {
  console.log(`使い方:
  pnpm wizard                       対話形式でセットアップ
  pnpm wizard --brief brief.md      brief.mdから非対話で構築(LPコピーはClaude自動執筆)

オプション:
  -b, --brief <path>      brief.md のパス(指定で非対話モード)
  -y, --non-interactive   非対話モード(briefなしで既定値のまま実行)
      --no-ai             ClaudeによるLPコピー自動執筆を無効化
      --no-image          Gemini画像生成をスキップ
      --no-cloudflare     wrangler による Pages プロジェクト作成をスキップ
  -h, --help              このヘルプを表示
`)
}

function banner(mode) {
  console.log('')
  console.log('==============================================')
  console.log(` Site Wizard — ${mode}`)
  console.log('==============================================')
  console.log('')
}

async function runInteractive() {
  banner('対話モード')
  console.log('対話で site.config.json を生成します。')
  console.log('いつでも Ctrl+C で中断できます。\n')

  const existing = existsSync(CONFIG_PATH)
    ? JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'))
    : {}

  console.log('◆ 1/6  事業・ブランド')
  const brandName = await ask('  事業名', existing.brand?.name || '')
  const shortName = await ask(
    '  ブランド略称(英字推奨)',
    existing.brand?.shortName || brandName.toUpperCase().replace(/\s+/g, ''),
  )
  const tagline = await ask('  キャッチコピー(一言)', existing.brand?.tagline || '')
  const description = await ask('  説明文(2-3行)', existing.brand?.description || '')
  const primaryColor = await ask(
    '  ブランドカラー(HEX #rrggbb)',
    existing.brand?.primaryColor || '#0ea5e9',
  )

  console.log('\n◆ 2/6  プロジェクト識別子')
  const defaultSlug = existing.projectName || generateSlug(shortName || brandName)
  const projectName = (await ask('  プロジェクト slug (小文字英数-)', defaultSlug)) || defaultSlug
  const slug = generateSlug(projectName)
  if (slug !== projectName) console.log(`  ※ slug正規化: ${projectName} → ${slug}`)

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

  console.log('\n◆ 4/6  有効にするページ(LPは必須)')
  const dashboard = await askBool('  ダッシュボード', existing.pages?.dashboard ?? false)
  const form = await askBool('  お問い合わせフォーム', existing.pages?.form ?? true)
  const documents = await askBool('  資料', existing.pages?.documents ?? false)
  const slides = await askBool('  スライド', existing.pages?.slides ?? false)

  console.log('\n◆ 5/6  連絡先(任意)')
  const company = await ask('  会社名', existing.contact?.company || brandName)
  const email = await ask('  メール', existing.contact?.email || '')
  const phone = await ask('  電話', existing.contact?.phone || '')

  console.log('\n◆ 6/6  ヒーロー画像')
  const genImage = process.env.GEMINI_API_KEY
    ? await askBool('  Gemini でヒーロー画像を自動生成しますか?', true)
    : false
  if (!process.env.GEMINI_API_KEY) console.log('  (GEMINI_API_KEY 未設定のためスキップ)')

  close()

  const cfg = buildConfig({
    slug,
    brand: { name: brandName, shortName, tagline, description, primaryColor },
    hero: { headline: tagline || brandName, subheadline: '', bullets: null },
    access: { mode, username, password },
    pages: { dashboard, form, documents, slides },
    contact: { company, email, phone },
    existingBullets: existing.hero?.bullets,
  })

  await finalize(cfg, { genImage, genCloudflare: true })
}

async function runFromBrief(briefPath, opts) {
  banner('非対話(brief駆動)モード')

  if (!existsSync(briefPath)) {
    throw new Error(`brief ファイルが見つかりません: ${briefPath}`)
  }
  const { fields, memo } = loadBrief(briefPath)
  console.log(`📄 brief: ${path.relative(ROOT_DIR, briefPath)}`)
  console.log(`   抽出フィールド: ${Object.keys(fields).length} 件`)

  // 必須フィールド
  const name = fields.name
  if (!name) throw new Error('brief.md の "- name: ..." が未設定です')

  const shortName = fields.shortName || name.toUpperCase().replace(/\s+/g, '')
  const slug = generateSlug(fields.slug || shortName || name)
  const primaryColor = fields.primaryColor || '#0ea5e9'

  const accessMode = (fields.access === 'closed' ? 'closed' : 'open')
  const username = accessMode === 'closed' ? fields.username || 'admin' : ''
  let password = ''
  if (accessMode === 'closed') {
    password =
      !fields.password || fields.password === 'auto'
        ? generatePassword(16)
        : fields.password
  }

  const enabled = new Set(
    splitList(fields.pages || 'lp, form').map((s) => s.toLowerCase()),
  )
  enabled.add('lp')

  // LPコピーをClaudeで自動執筆
  let copy = null
  if (!opts.noAi && process.env.ANTHROPIC_API_KEY) {
    try {
      console.log('\n🧠 Claude でLPコピーを執筆中...')
      const t0 = Date.now()
      const { copy: c, usage } = await draftLpCopy({
        name,
        primaryColor,
        memo,
      })
      copy = c
      console.log(
        `   ✅ in ${usage?.input_tokens || '?'} / out ${usage?.output_tokens || '?'} tokens, ${Date.now() - t0}ms`,
      )
      console.log(`   tagline:     ${copy.tagline}`)
      console.log(`   headline:    ${copy.headline}`)
    } catch (err) {
      console.log(`   ⚠️  AI執筆失敗: ${err.message}`)
      console.log('   (placeholder文言で続行)')
    }
  } else if (opts.noAi) {
    console.log('🧠 --no-ai 指定: Claude執筆をスキップ')
  } else {
    console.log('🧠 ANTHROPIC_API_KEY 未設定: Claude執筆をスキップ')
  }

  const tagline = copy?.tagline || fields.tagline || ''
  const description = copy?.description || fields.description || ''

  const cfg = buildConfig({
    slug,
    brand: { name, shortName, tagline, description, primaryColor },
    hero: {
      headline: copy?.headline || tagline || name,
      subheadline: copy?.subheadline || '',
      bullets: copy?.bullets || null,
    },
    access: { mode: accessMode, username, password },
    pages: {
      dashboard: enabled.has('dashboard'),
      form: enabled.has('form'),
      documents: enabled.has('documents') || enabled.has('docs'),
      slides: enabled.has('slides'),
    },
    contact: {
      company: fields.company || name,
      email: fields.email || '',
      phone: fields.phone || '',
    },
  })

  await finalize(cfg, {
    genImage: !opts.noImage && !!process.env.GEMINI_API_KEY,
    genCloudflare: !opts.noCloudflare,
  })
}

function buildConfig({ slug, brand, hero, access, pages, contact, existingBullets }) {
  const bullets =
    hero.bullets ||
    existingBullets ||
    ['訴求ポイント1', '訴求ポイント2', '訴求ポイント3']
  return {
    projectName: slug,
    brand: {
      name: brand.name,
      shortName: brand.shortName,
      tagline: brand.tagline,
      description: brand.description,
      primaryColor: brand.primaryColor,
    },
    seo: {
      title: `${brand.name} | ${brand.tagline}`.trim().replace(/\s*\|\s*$/, ''),
      description: brand.description || brand.tagline,
      ogImage: '/ogp.png',
    },
    hero: {
      headline: hero.headline,
      subheadline: hero.subheadline,
      bullets,
      image: '/hero.png',
      ctaLabel: pages.form ? 'お問い合わせ' : undefined,
      ctaTarget: pages.form ? 'form' : undefined,
    },
    access: {
      mode: access.mode,
      username: access.username,
      password: access.password,
    },
    pages: {
      lp: true,
      dashboard: pages.dashboard,
      form: pages.form,
      documents: pages.documents,
      slides: pages.slides,
    },
    contact: {
      company: contact.company,
      email: contact.email,
      phone: contact.phone,
    },
  }
}

async function finalize(cfg, { genImage, genCloudflare }) {
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2) + '\n', 'utf-8')
  console.log(`\n✅ site.config.json を書き出しました`)

  if (cfg.access.mode === 'closed' && cfg.access.password) {
    mkdirSync(OUTPUT_DIR, { recursive: true })
    const credPath = path.join(OUTPUT_DIR, `${cfg.projectName}.credentials.txt`)
    writeFileSync(
      credPath,
      [
        `# ${cfg.brand.name} (${cfg.projectName})`,
        `URL:      https://${cfg.projectName}.pages.dev`,
        `Username: ${cfg.access.username}`,
        `Password: ${cfg.access.password}`,
        '',
        '※ この情報は gitignore 対象です。必要な方にのみ安全な手段で共有してください。',
      ].join('\n') + '\n',
      'utf-8',
    )
    console.log(`🔐 認証情報: ${path.relative(ROOT_DIR, credPath)}`)
    console.log(`   Username: ${cfg.access.username}`)
    console.log(`   Password: ${cfg.access.password}`)
  }

  if (genImage) {
    mkdirSync(PUBLIC_DIR, { recursive: true })
    try {
      console.log('\n🎨 hero.png を生成中...')
      const t0 = Date.now()
      const hero = await generateImage(
        buildHeroPrompt({
          brandName: cfg.brand.name,
          tagline: cfg.brand.tagline,
          description: cfg.brand.description,
          primaryColor: cfg.brand.primaryColor,
        }),
      )
      writeFileSync(path.join(PUBLIC_DIR, 'hero.png'), hero.buffer)
      console.log(`   ✅ ${Math.round(hero.buffer.length / 1024)}KB / ${Date.now() - t0}ms`)

      await new Promise((r) => setTimeout(r, 2000))

      console.log('🎨 ogp.png を生成中...')
      const t1 = Date.now()
      const ogp = await generateImage(
        buildOgpPrompt({
          brandName: cfg.brand.name,
          tagline: cfg.brand.tagline,
          primaryColor: cfg.brand.primaryColor,
        }),
      )
      writeFileSync(path.join(PUBLIC_DIR, 'ogp.png'), ogp.buffer)
      console.log(`   ✅ ${Math.round(ogp.buffer.length / 1024)}KB / ${Date.now() - t1}ms`)
    } catch (err) {
      console.log(`   ⚠️  画像生成に失敗: ${err.message}`)
      console.log('   (サイトは既定プレースホルダで動作します。後で pnpm gen:hero で再実行可)')
    }
  }

  if (genCloudflare) {
    console.log('\n☁️  Cloudflare Pages プロジェクト作成')
    const cf = createPagesProject(cfg.projectName)
    if (cf.skipped) console.log(`   (スキップ) ${cf.reason}`)
    else if (cf.ok)
      console.log(
        cf.alreadyExists
          ? `   ℹ️  既に存在 (${cfg.projectName}.pages.dev)`
          : `   ✅ 作成完了 → ${cfg.projectName}.pages.dev`,
      )
    else console.log(`   ⚠️  失敗: ${(cf.error || '').slice(0, 300)}`)
  }

  console.log('\n==============================================')
  console.log(' セットアップ完了')
  console.log('==============================================\n')
  console.log('次のコマンドで確認・デプロイ:')
  console.log('  pnpm dev         # ローカルプレビュー')
  console.log('  pnpm build       # ビルド確認')
  console.log(`  git add -A && git commit -m "setup: ${cfg.projectName}"`)
  console.log('  git push origin main   # → 自動デプロイ\n')
  console.log(`公開URL: https://${cfg.projectName}.pages.dev`)
  if (cfg.access.mode === 'closed') {
    console.log('※ CLOSED: wizard-output/*.credentials.txt を参照')
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    printHelp()
    return
  }
  if (args.brief) {
    await runFromBrief(args.brief, args)
  } else {
    await runInteractive()
  }
}

main().catch((err) => {
  console.error('\n💥 エラー:', err.message)
  close()
  process.exit(1)
})
