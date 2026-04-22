import { useEffect, useMemo, useState } from 'react'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import FormPage from './pages/FormPage'
import Login from './pages/Login'
import Slides from './pages/Slides'
import Documents from './pages/Documents'
import { PAGE_LABELS, PageKey, config, enabledPages } from './config'

const AUTH_KEY = `site-wizard:auth:${config.projectName}`

function pageFromHash(valid: PageKey[]): PageKey {
  const h = window.location.hash.replace('#', '') as PageKey
  if ((valid as string[]).includes(h)) return h
  return 'lp'
}

export default function App() {
  const pages = useMemo(enabledPages, [])
  const closed = config.access.mode === 'closed'
  const [authed, setAuthed] = useState<boolean>(
    () => !closed || sessionStorage.getItem(AUTH_KEY) === '1',
  )
  const [page, setPageState] = useState<PageKey>(() => pageFromHash(pages))

  const setPage = (p: PageKey) => {
    setPageState(p)
    window.location.hash = p === 'lp' ? '' : p
    window.scrollTo({ top: 0 })
  }

  useEffect(() => {
    const handler = () => setPageState(pageFromHash(pages))
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [pages])

  if (closed && !authed) {
    return (
      <Login
        onLogin={() => {
          sessionStorage.setItem(AUTH_KEY, '1')
          setAuthed(true)
        }}
      />
    )
  }

  const logout = () => {
    sessionStorage.removeItem(AUTH_KEY)
    setAuthed(false)
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setPage('lp')}
              className="flex items-center gap-2 text-slate-900"
              aria-label={`${config.brand.name} トップ`}
            >
              <img src="/favicon.svg" alt="" className="h-8 w-8 md:h-9 md:w-9" />
              <span className="flex flex-col items-start leading-none">
                <span className="font-serif text-sm font-bold tracking-[0.15em] md:text-base">
                  {config.brand.shortName || config.brand.name}
                </span>
                <span className="mt-0.5 text-[9px] text-slate-500 md:text-[10px]">
                  {config.brand.tagline}
                </span>
              </span>
            </button>
            {closed && (
              <button
                onClick={logout}
                className="rounded-md border border-slate-200 px-2.5 py-1 text-[10px] font-medium text-slate-500 hover:bg-slate-50 md:px-3 md:py-2 md:text-xs"
              >
                ログアウト
              </button>
            )}
          </div>
          {pages.length > 1 && (
            <nav className="mt-2 -mx-4 flex gap-1 overflow-x-auto px-4 pb-0.5 md:mx-0 md:mt-3 md:px-0 md:pb-0 scrollbar-none">
              {pages.map((k) => (
                <button
                  key={k}
                  onClick={() => setPage(k)}
                  className={`flex-shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition md:px-4 md:py-2 md:text-sm ${
                    page === k
                      ? 'bg-brand-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {PAGE_LABELS[k]}
                </button>
              ))}
            </nav>
          )}
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6 md:py-8">
        {page === 'lp' && <LandingPage onNavigate={setPage} />}
        {page === 'slides' && <Slides />}
        {page === 'documents' && <Documents />}
        {page === 'dashboard' && <Dashboard />}
        {page === 'form' && <FormPage />}
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 text-xs text-slate-500 md:flex-row md:items-center md:justify-between md:px-6">
          <div>© {new Date().getFullYear()} {config.brand.name}</div>
          <div className="text-[11px] text-slate-400">
            powered by Site Wizard
          </div>
        </div>
      </footer>
    </div>
  )
}
