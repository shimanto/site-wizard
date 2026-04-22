#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { ROOT_DIR, loadEnv } from '../scripts/env.mjs'
import { generateImage, buildHeroPrompt, buildOgpPrompt } from '../scripts/gemini.mjs'

loadEnv()

const CONFIG_PATH = path.join(ROOT_DIR, 'site.config.json')
const PUBLIC_DIR = path.join(ROOT_DIR, 'public')

async function main() {
  const cfg = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'))
  mkdirSync(PUBLIC_DIR, { recursive: true })

  const args = new Set(process.argv.slice(2))
  const doHero = args.size === 0 || args.has('hero')
  const doOgp = args.size === 0 || args.has('ogp')

  if (doHero) {
    console.log('🎨 hero.png を生成中...')
    const t0 = Date.now()
    const r = await generateImage(
      buildHeroPrompt({
        brandName: cfg.brand.name,
        tagline: cfg.brand.tagline,
        description: cfg.brand.description,
        primaryColor: cfg.brand.primaryColor,
      }),
    )
    writeFileSync(path.join(PUBLIC_DIR, 'hero.png'), r.buffer)
    console.log(`   ✅ ${Math.round(r.buffer.length / 1024)}KB / ${Date.now() - t0}ms`)
  }

  if (doOgp) {
    if (doHero) await new Promise((r) => setTimeout(r, 2000))
    console.log('🎨 ogp.png を生成中...')
    const t0 = Date.now()
    const r = await generateImage(
      buildOgpPrompt({
        brandName: cfg.brand.name,
        tagline: cfg.brand.tagline,
        primaryColor: cfg.brand.primaryColor,
      }),
    )
    writeFileSync(path.join(PUBLIC_DIR, 'ogp.png'), r.buffer)
    console.log(`   ✅ ${Math.round(r.buffer.length / 1024)}KB / ${Date.now() - t0}ms`)
  }
}

main().catch((err) => {
  console.error('💥', err.message)
  process.exit(1)
})
