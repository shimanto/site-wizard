const API_URL = 'https://api.anthropic.com/v1/messages'
const DEFAULT_MODEL = 'claude-sonnet-4-6'
const DEFAULT_VERSION = '2023-06-01'

/**
 * Claude Messages API を呼び出し、テキスト応答を返す。
 */
export async function callClaude(
  userPrompt,
  { system, model = DEFAULT_MODEL, maxTokens = 1024, temperature = 0.7 } = {},
) {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) {
    throw new Error('ANTHROPIC_API_KEY is not set. .env に設定してください。')
  }

  const body = {
    model,
    max_tokens: maxTokens,
    temperature,
    messages: [{ role: 'user', content: userPrompt }],
  }
  if (system) body.system = system

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': DEFAULT_VERSION,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = (await res.text()).slice(0, 500)
    throw new Error(`Claude API ${res.status}: ${errText}`)
  }

  const data = await res.json()
  const blocks = data.content || []
  const text = blocks
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
  return { text, usage: data.usage }
}

/**
 * 応答テキストから JSON オブジェクトを抽出。
 * ```json ... ``` コードブロックも、裸のJSONも許容。
 */
export function extractJson(text) {
  // ```json ... ``` 優先
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fence ? fence[1] : text

  // JSONの開始位置を探して最外括弧までスキャン
  const start = candidate.search(/[{[]/)
  if (start < 0) throw new Error('No JSON found in response')

  let depth = 0
  let inStr = false
  let esc = false
  const open = candidate[start]
  const close = open === '{' ? '}' : ']'
  for (let i = start; i < candidate.length; i++) {
    const c = candidate[i]
    if (inStr) {
      if (esc) {
        esc = false
      } else if (c === '\\') {
        esc = true
      } else if (c === '"') {
        inStr = false
      }
      continue
    }
    if (c === '"') inStr = true
    else if (c === open) depth++
    else if (c === close) {
      depth--
      if (depth === 0) {
        const raw = candidate.slice(start, i + 1)
        return JSON.parse(raw)
      }
    }
  }
  throw new Error('Unterminated JSON in response')
}

/** LPコピーをClaudeでドラフトする */
export async function draftLpCopy({ name, primaryColor, memo }) {
  const system = `あなたは日本のB2Bサービスサイトに強いコピーライターです。
企業サイトのLPに載せる最小限のコピーを、簡潔・具体的・誇張のない日本語で執筆します。
出力は必ず指定のJSON形式のみを返してください(前置き・後置き禁止)。`

  const prompt = `以下のブリーフから、サイトLPに使う日本語コピーをドラフトしてください。

# ブランド名
${name}

# ブランドカラー
${primaryColor || '(未指定)'}

# ブリーフ(事業内容・ターゲット・差別化など)
${memo || '(特記事項なし)'}

# 出力(JSONのみ)
{
  "tagline": "ひとこと(15〜25文字程度、キャッチコピー)",
  "description": "事業内容を2〜3行で説明(80〜140文字)",
  "headline": "LPのメイン見出し(20〜36文字、共感・問題提起型を推奨)",
  "subheadline": "見出し直下の補助文(40〜60文字)",
  "bullets": ["訴求ポイント1(20〜30文字)", "訴求ポイント2(20〜30文字)", "訴求ポイント3(20〜30文字)"]
}`

  const { text, usage } = await callClaude(prompt, { system, maxTokens: 800 })
  const json = extractJson(text)
  return { copy: json, usage }
}

/** メモ→brief.md のドラフト */
export async function draftBriefFromMemo({ memo, defaults = {} }) {
  const system = `あなたは対話ヒアリングを補助する構成作家です。
クライアントの自由記述メモから、サイト生成ウィザード用の「brief.md」を日本語でドラフトします。
足りない情報は賢く推論し、安全側(空欄)に倒します。出力は必ず指定のmarkdown形式のみを返してください。`

  const prompt = `以下のメモから brief.md をドラフトしてください。

# メモ
${memo}

# 既定値(指定があれば優先)
- primaryColor: ${defaults.primaryColor || '#0ea5e9'}
- access: ${defaults.access || 'open'}
- pages: ${defaults.pages || 'lp, form'}

# 出力フォーマット(そのままmarkdownで出力、コードブロックで囲まない)
# Site Brief — <短い案件ラベル>

- name:
- shortName:
- slug:
- primaryColor: ${defaults.primaryColor || '#0ea5e9'}
- access: ${defaults.access || 'open'}
- username:
- password: auto
- pages: ${defaults.pages || 'lp, form'}
- company:
- email:
- phone:

## メモ(AI入力用)
- 業種:
- ターゲット:
- 差別化ポイント:
- 特徴/強み:
- その他:

# 指示
- name は正式名称。shortNameは英字略称(例: AKANE_PARTNERS)、slugは小文字英数-(例: akane-partners)。
- 未確定項目は空欄のままにする(勝手に捏造しない)。
- メモ欄はヒアリング内容を整理して書く(推測は「?」マークをつけて明示)。`

  const { text, usage } = await callClaude(prompt, { system, maxTokens: 1200 })
  // markdown本文のみを取り出す(fenceがあれば剥がす)
  const fence = text.match(/```(?:markdown|md)?\s*([\s\S]*?)```/)
  const md = (fence ? fence[1] : text).trim()
  return { markdown: md, usage }
}
