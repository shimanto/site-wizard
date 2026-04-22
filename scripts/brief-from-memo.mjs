#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { ROOT_DIR, loadEnv } from './env.mjs'
import { draftBriefFromMemo } from './claude.mjs'

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
  pnpm brief <memo.txt> [-o brief.md]   メモから brief.md を生成(Claudeでドラフト)
  pnpm brief -           標準入力からメモを読む

例:
  pnpm brief hearing.txt
  pnpm brief hearing.txt -o brief.md
  echo "..." | pnpm brief -
`)
}

async function readMemo(src) {
  if (src === '-' || !src) {
    return await new Promise((resolve, reject) => {
      let buf = ''
      process.stdin.setEncoding('utf-8')
      process.stdin.on('data', (d) => (buf += d))
      process.stdin.on('end', () => resolve(buf))
      process.stdin.on('error', reject)
    })
  }
  if (!existsSync(src)) throw new Error(`メモファイルが見つかりません: ${src}`)
  return readFileSync(src, 'utf-8')
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) return printHelp()

  const memo = (await readMemo(args.memo || '-')).trim()
  if (!memo) throw new Error('メモ内容が空です')

  console.log('🧠 Claude で brief.md をドラフト中...')
  const t0 = Date.now()
  const { markdown, usage } = await draftBriefFromMemo({ memo })
  console.log(
    `   ✅ in ${usage?.input_tokens || '?'} / out ${usage?.output_tokens || '?'} tokens, ${Date.now() - t0}ms`,
  )

  const outPath = args.output
    ? path.resolve(args.output)
    : path.join(ROOT_DIR, 'brief.md')
  writeFileSync(outPath, markdown + '\n', 'utf-8')
  console.log(`\n✅ 書き出し完了: ${path.relative(process.cwd(), outPath) || outPath}`)
  console.log('\n次のステップ:')
  console.log(`  1) ${path.basename(outPath)} を開いて内容を確認・調整`)
  console.log(`  2) pnpm wizard --brief ${path.basename(outPath)}`)
}

main().catch((err) => {
  console.error('\n💥 エラー:', err.message)
  process.exit(1)
})
