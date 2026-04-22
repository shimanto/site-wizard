import { spawn } from 'node:child_process'

/**
 * Claude Code (claude CLI) を headless で呼び出し、エージェントループを活用する。
 *
 * 単発API呼び出しと違い、CCは:
 *   - ファイルを読んで文脈を把握する(Read/Glob/Grep)
 *   - 自己批評・反復する
 *   - ツール使用で情報を能動収集する
 *
 * 本モジュールは read-only ツールのみを許可して、結果を JSON Schema で検証された
 * 構造化オブジェクトまたは Write 経由のファイルとして受け取る。
 */

const DEFAULT_MODEL = 'opus'
const DEFAULT_BUDGET_USD = '5'

function runClaude({
  prompt,
  cwd,
  model = DEFAULT_MODEL,
  allowedTools = ['Read', 'Glob', 'Grep'],
  jsonSchema = null,
  appendSystemPrompt = null,
  onProgress = null,
}) {
  const args = [
    '-p',
    '--model', model,
    '--permission-mode', 'bypassPermissions',
    '--allowedTools', allowedTools.join(','),
    '--output-format', 'json',
    '--max-budget-usd', DEFAULT_BUDGET_USD,
    '--no-session-persistence',
  ]
  if (jsonSchema) {
    args.push('--json-schema', JSON.stringify(jsonSchema))
  }
  if (appendSystemPrompt) {
    args.push('--append-system-prompt', appendSystemPrompt)
  }

  return new Promise((resolve, reject) => {
    const child = spawn('claude', args, {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    })

    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d) => {
      const s = d.toString()
      stdout += s
      if (onProgress) onProgress('stdout', s)
    })
    child.stderr.on('data', (d) => {
      const s = d.toString()
      stderr += s
      if (onProgress) onProgress('stderr', s)
    })
    child.on('error', (err) => {
      if (err.code === 'ENOENT') {
        reject(
          new Error(
            'claude CLI が見つかりません。Claude Code がインストールされていません。\n' +
              'インストール: https://claude.com/claude-code',
          ),
        )
      } else {
        reject(err)
      }
    })
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr })
      } else {
        reject(
          new Error(
            `claude exited with code ${code}\n--- stderr ---\n${stderr.slice(-1000)}\n--- stdout tail ---\n${stdout.slice(-500)}`,
          ),
        )
      }
    })

    child.stdin.write(prompt)
    child.stdin.end()
  })
}

/**
 * json出力の外側(type=result)をパースし、.result を返す。
 * .result が文字列でかつJSONとして解釈可能なら JSON.parse する。
 */
function parseJsonResult(stdout) {
  const trimmed = stdout.trim()
  if (!trimmed) throw new Error('claude から空の応答')
  let outer
  try {
    outer = JSON.parse(trimmed)
  } catch (err) {
    throw new Error(`claude 応答JSON parse失敗: ${err.message}\n--- raw ---\n${trimmed.slice(0, 500)}`)
  }
  if (outer.is_error || outer.type === 'error') {
    throw new Error(`claude エラー応答: ${outer.error || outer.subtype || JSON.stringify(outer).slice(0, 300)}`)
  }
  const result = outer.result
  if (result === undefined) {
    return { payload: outer, meta: outer }
  }
  // result が文字列 -> JSON schema 応答なら JSON 文字列のはず
  if (typeof result === 'string') {
    const s = result.trim()
    if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))) {
      try {
        return { payload: JSON.parse(s), meta: outer }
      } catch {
        return { payload: s, meta: outer }
      }
    }
    return { payload: s, meta: outer }
  }
  return { payload: result, meta: outer }
}

// ==========================================================================
// LPコピー執筆
// ==========================================================================

const LP_COPY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'tagline',
    'description',
    'headline',
    'subheadline',
    'bullets',
    'heroImagePrompt',
  ],
  properties: {
    tagline: {
      type: 'string',
      description: '短いキャッチコピー(15〜25文字)。事業を一言で表現。',
    },
    description: {
      type: 'string',
      description: '事業の説明(80〜140文字、2〜3行)。具体性重視、誇張回避。',
    },
    headline: {
      type: 'string',
      description: 'LP上部のメイン見出し(20〜36文字)。共感・問題提起を推奨。',
    },
    subheadline: {
      type: 'string',
      description: '見出し直下の補助文(40〜60文字)。',
    },
    bullets: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      items: {
        type: 'string',
        description: '訴求ポイント1項目(20〜30文字)。抽象語を避け、具体的ベネフィット。',
      },
    },
    heroImagePrompt: {
      type: 'string',
      description:
        'Gemini(nano-banana-pro-preview)向けの日本語画像プロンプト。横長(16:9)、企業サイトHeroビジュアル、文字なし、ブランド色と事業雰囲気を反映した抽象構成。',
    },
  },
}

export async function draftLpCopyWithCC({ briefPath, cwd, model = DEFAULT_MODEL, onProgress = null }) {
  const systemPrompt = `あなたは日本のB2Bサービスサイトに強いコピーライターです。
与えられたブリーフを注意深く読み、さらにプロジェクトのコード・既存の同種案件(あれば)を参照した上で、
高品質なLP文言を日本語でドラフトします。

重要:
- 指定のJSONスキーマに完全準拠した構造化出力のみを返してください。
- 誇張・テンプレ的表現を避け、具体性・差別化・数字(可能なら)を重視。
- 指定の文字数範囲を厳守(過不足はスキーマ違反)。`

  const prompt = `このディレクトリのプロジェクトを案件サイトとしてセットアップします。
brief ファイルと、必要なら周辺コンテキストを読み取り、LP文言を執筆してください。

# 手順
1. ${briefPath} を Read で読む(事業内容・ターゲット・差別化)
2. site.config.example.json を Read で読む(出力構造の参考)
3. src/pages/LandingPage.tsx を Read で読む(実際にレンダリングされる構造)
4. 余裕があれば Glob/Grep で周辺の同種案件や類似パターンを短く確認(任意)
5. 総合して構造化LP文言をドラフト

# 出力
JSON Schema に従って返してください。前置きや説明は一切不要です。`

  const { stdout } = await runClaude({
    prompt,
    cwd,
    model,
    allowedTools: ['Read', 'Glob', 'Grep'],
    jsonSchema: LP_COPY_SCHEMA,
    appendSystemPrompt: systemPrompt,
    onProgress,
  })

  const { payload, meta } = parseJsonResult(stdout)
  return { copy: payload, meta }
}

// ==========================================================================
// メモ → brief.md 執筆(CCが Write ツールでファイルに書き出す方式)
// ==========================================================================

export async function draftBriefFromMemoWithCC({
  memoPath,
  outputPath,
  cwd,
  defaults = {},
  model = DEFAULT_MODEL,
  onProgress = null,
}) {
  const systemPrompt = `あなたはヒアリング内容を整理する構成作家です。
クライアントの自由記述メモから、サイト生成ウィザード用の brief.md を日本語で書き起こします。
推測で埋めず、不明項目は空欄にしつつ、メモ欄に要点を整理します。`

  const defaultsBlock = [
    `- primaryColor: ${defaults.primaryColor || '#0ea5e9'}`,
    `- access: ${defaults.access || 'open'}`,
    `- pages: ${defaults.pages || 'lp, form'}`,
  ].join('\n')

  const prompt = `以下の作業を行ってください。

# タスク
1. ${memoPath} を Read で読む(ヒアリング自由記述)
2. brief.example.md を Read で書式を確認
3. 読み取った内容を整理し、${outputPath} に brief.md を Write で書き出す

# 出力フォーマット(Write で書き出すファイル内容)
先頭はテンプレと同じく:
  # Site Brief — <短い案件ラベル>

続いて箇条書きフィールド(指定があれば埋める、不明は空欄):
  - name:              <事業の正式名称>
  - shortName:         <英字略称>
  - slug:              <小文字英数-のslug>
${defaultsBlock}
  - username:          <closed時のみ>
  - password:          auto
  - company:
  - email:
  - phone:

## メモ(AI入力用)
- 業種:
- ターゲット:
- 差別化ポイント:
- 特徴/強み:
- その他:

# ルール
- name, shortName, slug が明記されていればそれを使い、曖昧なら空欄
- 推測した項目には「?」を末尾につけて明示する
- メモ欄は、原文のエッセンスを箇条書きで整理(創作はしない)
- 最後に Write を呼んで ${outputPath} に書き出したら完了

# 出力(stdout)
JSON で { "status": "ok", "outputPath": "..." } を返してください。`

  const { stdout } = await runClaude({
    prompt,
    cwd,
    model,
    allowedTools: ['Read', 'Write', 'Glob'],
    jsonSchema: {
      type: 'object',
      additionalProperties: true,
      required: ['status'],
      properties: {
        status: { type: 'string' },
        outputPath: { type: 'string' },
      },
    },
    appendSystemPrompt: systemPrompt,
    onProgress,
  })

  const { payload, meta } = parseJsonResult(stdout)
  return { status: payload, meta }
}
