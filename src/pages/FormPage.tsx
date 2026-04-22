import { useState } from 'react'
import { config } from '../config'

export default function FormPage() {
  const [sent, setSent] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const to = config.contact.email
    if (!to) {
      alert('送信先メールアドレスが config に設定されていません')
      return
    }
    const subject = encodeURIComponent(`[${config.brand.name}] お問い合わせ: ${name}`)
    const body = encodeURIComponent(
      `お名前: ${name}\nEmail: ${email}\n\n${message}\n\n---\nsent from ${location.href}`,
    )
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`
    setSent(true)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-slate-900 md:text-3xl">お問い合わせ</h1>
        <p className="mt-1 text-sm text-slate-500">下記フォームよりご連絡ください</p>
      </div>

      {sent ? (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-6 text-sm text-brand-900">
          メーラーを起動しました。送信をご確認ください。
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-700">お名前 *</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-700">メールアドレス *</span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-700">ご相談内容 *</span>
            <textarea
              required
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-brand-700"
          >
            メーラーで送信
          </button>
          <p className="text-xs text-slate-400">
            ※ このフォームは送信時にメーラーを起動します(mailto)。サーバー送信が必要な場合は拡張してください。
          </p>
        </form>
      )}
    </div>
  )
}
