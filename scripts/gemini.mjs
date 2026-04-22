const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
const MODEL = 'nano-banana-pro-preview'

export async function generateImage(prompt, { model = MODEL } = {}) {
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    throw new Error('GEMINI_API_KEY is not set. Copy .env.example to .env and fill in the key.')
  }
  const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${key}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
    }),
  })
  if (!res.ok) {
    const body = (await res.text()).slice(0, 500)
    throw new Error(`Gemini ${res.status}: ${body}`)
  }
  const data = await res.json()
  const parts = data.candidates?.[0]?.content?.parts ?? []
  const imagePart = parts.find((p) => p.inlineData)
  if (!imagePart) {
    const textPart = parts.find((p) => p.text)
    throw new Error(`No image in response. text: ${(textPart?.text || '').slice(0, 200)}`)
  }
  return {
    buffer: Buffer.from(imagePart.inlineData.data, 'base64'),
    mimeType: imagePart.inlineData.mimeType,
  }
}

export function buildHeroPrompt({ brandName, tagline, description, primaryColor }) {
  return `横長(landscape, 16:9)のモダンなWebサイト用ヒーロービジュアルを1枚生成してください。

# 企業・事業
- 名称: ${brandName}
- キャッチ: ${tagline}
- 説明: ${description}

# スタイル
- プロフェッショナル・清潔感・信頼感
- テキストは含めないでください(後からWebで重ねます)
- 配色のアクセントとして ${primaryColor} を使用
- 抽象的・幾何学的・余白を活かしたグラデーション構成
- 写実的な人物や具体的なロゴは入れないでください
- 1200x675px相当

# 厳守
- 文字を画像内に描画しない
- シンプルで近代的、企業サイトのヒーローとして自然に収まること`
}

export function buildOgpPrompt({ brandName, tagline, primaryColor }) {
  return `OGP用のシンプルな正方形〜横長(1200x630)画像を1枚生成してください。

# 用途
- SNS共有時のサムネイル (Open Graph Protocol image)

# 企業
- ${brandName} — ${tagline}

# スタイル
- アクセント: ${primaryColor}
- 抽象的なグラデーション・幾何学模様中心
- 文字は描画しない(テキストは別途重ねます)
- 清潔感のある企業サイト向けデザイン`
}
