import { spawnSync } from 'node:child_process'

function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf-8', shell: process.platform === 'win32' })
  return { code: r.status ?? 1, stdout: r.stdout || '', stderr: r.stderr || '' }
}

export function createPagesProject(projectName) {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  if (!apiToken || !accountId) {
    return {
      ok: false,
      skipped: true,
      reason: 'CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID が未設定です。Cloudflare ダッシュボードで手動作成してください。',
    }
  }

  const env = {
    ...process.env,
    CLOUDFLARE_API_TOKEN: apiToken,
    CLOUDFLARE_ACCOUNT_ID: accountId,
  }
  const args = ['wrangler', 'pages', 'project', 'create', projectName, '--production-branch=main']
  const r = spawnSync('npx', args, {
    encoding: 'utf-8',
    env,
    shell: process.platform === 'win32',
  })
  const out = (r.stdout || '') + (r.stderr || '')
  if (r.status === 0) return { ok: true, output: out }
  if (/already exists/i.test(out) || /duplicate/i.test(out)) {
    return { ok: true, alreadyExists: true, output: out }
  }
  return { ok: false, error: out }
}

export { run }
