import raw from '../site.config.json'

export type AccessMode = 'open' | 'closed'

export type PageKey = 'lp' | 'dashboard' | 'form' | 'documents' | 'slides'

export type SiteConfig = {
  projectName: string
  brand: {
    name: string
    shortName: string
    tagline: string
    description: string
    primaryColor: string
  }
  seo: {
    title: string
    description: string
    ogImage: string
  }
  hero: {
    headline: string
    subheadline?: string
    bullets: string[]
    image?: string
    ctaLabel?: string
    ctaTarget?: PageKey
  }
  access: {
    mode: AccessMode
    username: string
    password: string
  }
  pages: Record<PageKey, boolean>
  contact: {
    email: string
    phone: string
    company: string
  }
}

export const config = raw as SiteConfig

export const PAGE_LABELS: Record<PageKey, string> = {
  lp: 'トップ',
  dashboard: 'ダッシュボード',
  form: 'お問い合わせ',
  documents: '資料',
  slides: 'スライド',
}

export function enabledPages(): PageKey[] {
  const order: PageKey[] = ['lp', 'slides', 'documents', 'dashboard', 'form']
  return order.filter((k) => config.pages[k])
}
