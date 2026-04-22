import { useEffect, useState } from 'react'
import { config } from '../config'

type Item = {
  id: string
  title: string
  status: string
  memo: string
  updatedAt: string
}

const STORAGE_KEY = `site-wizard:dashboard:${config.projectName}`

const DEFAULT_STATUSES = ['検討中', '進行中', '保留', '完了']

function load(): Item[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Item[]
  } catch {
    return []
  }
}

function save(items: Item[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export default function Dashboard() {
  const [items, setItems] = useState<Item[]>(() => load())
  const [title, setTitle] = useState('')

  useEffect(() => {
    save(items)
  }, [items])

  const add = () => {
    if (!title.trim()) return
    const now = new Date().toISOString()
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title: title.trim(), status: DEFAULT_STATUSES[0], memo: '', updatedAt: now },
    ])
    setTitle('')
  }

  const update = (id: string, patch: Partial<Item>) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch, updatedAt: new Date().toISOString() } : it)),
    )
  }

  const remove = (id: string) => setItems((prev) => prev.filter((it) => it.id !== id))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-slate-900 md:text-3xl">ダッシュボード</h1>
        <p className="mt-1 text-sm text-slate-500">案件・タスクのステータス管理(ローカル保存)</p>
      </div>

      <div className="flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="新しい項目を追加..."
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <button
          onClick={add}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          追加
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {items.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">まだ項目がありません</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left font-medium">タイトル</th>
                <th className="px-3 py-2 text-left font-medium">ステータス</th>
                <th className="px-3 py-2 text-left font-medium">メモ</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((it) => (
                <tr key={it.id}>
                  <td className="px-3 py-2">
                    <input
                      value={it.title}
                      onChange={(e) => update(it.id, { title: e.target.value })}
                      className="w-full rounded border border-transparent bg-transparent px-1 py-1 hover:border-slate-200 focus:border-brand-400 focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={it.status}
                      onChange={(e) => update(it.id, { status: e.target.value })}
                      className="rounded border border-slate-200 px-2 py-1 text-xs"
                    >
                      {DEFAULT_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={it.memo}
                      onChange={(e) => update(it.id, { memo: e.target.value })}
                      placeholder="-"
                      className="w-full rounded border border-transparent bg-transparent px-1 py-1 hover:border-slate-200 focus:border-brand-400 focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => remove(it.id)}
                      className="text-xs text-rose-600 hover:underline"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
