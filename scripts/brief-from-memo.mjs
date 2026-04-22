#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { ROOT_DIR, loadEnv } from './env.mjs'
import { draftBriefFromMemoWithCC } from './cc-agent.mjs'

loadEnv()

function parseArgs(argv) {
  const args = { memo: null, output: null }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '-o' || a === '--output') args.output = argv[++i]
    else if (a === '-h' || a === '--help') args.help = true
    else if (!args.memo) args.memo = a
  }
  return args
}

function printHelp() {
  console.log(`使い方:
  pnpm brief <memo.txt> [-o brief.md]   メモから brief.md を生成(Claude Codeでドラフト)
  pnpm brief -                          標準入力からメモを読む

例:
  pnpm brief hearing.txt
  pnpm brief hearing.txt -o brief.md
  echo "..." | pnpm brief -
`)
}

async function readStdin() {
  return new Promise((resolve, reject) => {
    let buf = ''
    process.stdin.setEncoding('utf-8')
    process.stdin.on('data', (d) => (buf += d))
    process.stdin.on('end', () => resolve(buf))
    process.stdin.on('error', reject)
  })
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) return printHelp()

  // メモ入力を確定(指定ファイル or stdin)して、CCが読めるパスに保存
  let memoPath
  if (args.memo && args.memo !== '-') {
    if (!existsSync(args.memo)) throw new Error(`メモファイルが見つかりません: ${args.memo}`)
    memoPath = path.resolve(args.memo)
  } else {
    const text = (await readStdin()).trim()
    if (!text) throw new Error('メモ内容が空です')
    memoPath = path.join(tmpdir(), `site-wizard-memo-${Date.now()}.txt`)
    writeFileSync(memoPath, text, 'utf-8')
  }

  const outputAbs = path.resolve(args.output || path.join(ROOT_DIR, 'brief.md'))

  console.log('🧠 Claude Code で brief.md をドラフト中...')
  console.log(`   memo:   ${path.relative(process.cwd(), memoPath) || memoPath}`)
  console.log(`   output: ${path.relative(process.cwd(), outputAbs) || outputAbs}`)

  const t0 = Date.now()
  const { status, meta } = await draftBriefFromMemoWithCC({
    memoPath,
    outputPath: outputAbs,
    cwd: ROOT_DIR,
  })
  const cost = meta?.total_cost_usd ?? meta?.cost_usd
  const turns = meta?.num_turns ?? meta?.turns
  console.log(
    `\n✅ ${Date.now() - t0}ms${turns ? ` / ${turns} turns` : ''}${cost != null ? ` / $${Number(cost).toFixed(4)}` : ''}`,
  )

  if (!existsSync(outputAbs)) {
    throw new Error(
      `CCは完了を報告しましたが ${outputAbs} が見つかりません。stdout: ${JSON.stringify(status).slice(0, 200)}`,
    )
  }

  console.log(`\n次のステップ:`)
  console.log(`  1) ${path.relative(process.cwd(), outputAbs) || path.basename(outputAbs)} を開いて内容を確認・調整`)
  console.log(`  2) pnpm wizard --brief ${path.relative(ROOT_DIR, outputAbs) || 'brief.md'}`)
}

main().catch((err) => {
  console.error('\n💥 エラー:', err.message)
  process.exit(1)
})
