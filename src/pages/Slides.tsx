export default function Slides() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-slate-900 md:text-3xl">スライド</h1>
        <p className="mt-1 text-sm text-slate-500">プレゼン資料</p>
      </div>
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        <p className="mb-2">このページは雛形です。</p>
        <p>
          <code className="rounded bg-slate-100 px-1.5 py-0.5">public/slides/</code>
          に画像を配置し、このファイルを編集してスライドを表示してください。
        </p>
      </div>
    </div>
  )
}
