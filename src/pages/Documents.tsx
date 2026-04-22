export default function Documents() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-slate-900 md:text-3xl">資料</h1>
        <p className="mt-1 text-sm text-slate-500">公開資料・ダウンロード素材</p>
      </div>
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        <p className="mb-2">このページは雛形です。</p>
        <p>
          <code className="rounded bg-slate-100 px-1.5 py-0.5">public/</code>
          に PDF/画像を配置し、このファイルを編集してリンクを追加してください。
        </p>
      </div>
    </div>
  )
}
