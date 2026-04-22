import { config, PageKey } from '../config'

type Props = { onNavigate: (p: PageKey) => void }

export default function LandingPage({ onNavigate }: Props) {
  const hero = config.hero
  const ctaTarget = hero.ctaTarget && config.pages[hero.ctaTarget] ? hero.ctaTarget : null
  return (
    <div className="space-y-12 md:space-y-20">
      <section className="grid items-center gap-8 md:grid-cols-2">
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-600 md:text-xs">
            {config.brand.shortName || config.brand.name}
          </p>
          <h1 className="mb-5 font-serif text-3xl font-bold leading-tight text-slate-900 md:text-5xl">
            {hero.headline}
          </h1>
          {hero.subheadline && (
            <p className="mb-6 text-base text-slate-600 md:text-lg">{hero.subheadline}</p>
          )}
          <ul className="mb-8 space-y-2">
            {hero.bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700 md:text-base">
                <span className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-600" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          {ctaTarget && hero.ctaLabel && (
            <button
              onClick={() => onNavigate(ctaTarget)}
              className="rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-brand-700 md:text-base"
            >
              {hero.ctaLabel} →
            </button>
          )}
        </div>
        {hero.image && (
          <div className="overflow-hidden rounded-2xl bg-slate-100 shadow-lg">
            <img
              src={hero.image}
              alt=""
              className="h-full w-full object-cover"
              onError={(e) => {
                ;(e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm md:p-10">
        <h2 className="mb-4 font-serif text-xl font-bold text-slate-900 md:text-3xl">事業概要</h2>
        <p className="text-sm leading-relaxed text-slate-700 md:text-base">
          {config.brand.description}
        </p>
      </section>

      {(config.contact.email || config.contact.phone || config.contact.company) && (
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6 md:p-10">
          <h2 className="mb-4 font-serif text-xl font-bold text-slate-900 md:text-2xl">お問い合わせ</h2>
          <dl className="space-y-2 text-sm text-slate-700 md:text-base">
            {config.contact.company && (
              <div className="flex gap-3">
                <dt className="w-16 text-slate-500">会社</dt>
                <dd>{config.contact.company}</dd>
              </div>
            )}
            {config.contact.email && (
              <div className="flex gap-3">
                <dt className="w-16 text-slate-500">Email</dt>
                <dd>
                  <a className="text-brand-600 underline" href={`mailto:${config.contact.email}`}>
                    {config.contact.email}
                  </a>
                </dd>
              </div>
            )}
            {config.contact.phone && (
              <div className="flex gap-3">
                <dt className="w-16 text-slate-500">Tel</dt>
                <dd>{config.contact.phone}</dd>
              </div>
            )}
          </dl>
        </section>
      )}
    </div>
  )
}
