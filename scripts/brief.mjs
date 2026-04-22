import { readFileSync } from 'node:fs'

/**
 * brief.md フォーマット:
 *
 *   # Site Brief — <案件名>
 *
 *   - name: 〇〇パートナーズ
 *   - shortName: XXPARTNERS
 *   - slug: xx-partners
 *   - primaryColor: #0ea5e9
 *   - access: closed         # open | closed
 *   - username: admin
 *   - password: auto         # auto | <literal>
 *   - pages: lp, form, documents
 *   - company: 株式会社〇〇
 *   - email: info@example.com
 *   - phone: 03-1234-5678
 *
 *   ## メモ
 *   - 業種: 不動産仲介
 *   - ターゲット: ...
 *   - 差別化ポイント: ...
 *
 * トップレベルの `- key: value` 箇条書きを構造フィールドとして抽出し、
 * `##` 以降のすべてを memo 文字列としてまとめる。
 */
export function parseBrief(text) {
  const lines = text.split(/\r?\n/)
  const fields = {}
  const memoLines = []
  let inMemo = false

  for (const raw of lines) {
    const line = raw.replace(/\r$/, '')
    if (/^\s*##\s+/.test(line)) {
      inMemo = true
      // ヘッダ行自体は memo に含める(AIが文脈を読めるよう)
      memoLines.push(line)
      continue
    }
    if (inMemo) {
      memoLines.push(line)
      continue
    }
    const m = line.match(/^\s*-\s+([a-zA-Z][a-zA-Z0-9_]*)\s*:\s*(.*?)\s*$/)
    if (m) {
      const key = m[1]
      let val = m[2]
      // インラインコメント除去 (# 以降)
      val = val.replace(/\s+#.*$/, '').trim()
      fields[key] = val
    }
  }

  const memo = memoLines.join('\n').trim()
  return { fields, memo }
}

export function loadBrief(filePath) {
  const text = readFileSync(filePath, 'utf-8')
  return parseBrief(text)
}

/** カンマ区切り "lp, form, docs" を配列化 */
export function splitList(val) {
  if (!val) return []
  return val.split(/[,、]/).map((s) => s.trim()).filter(Boolean)
}
