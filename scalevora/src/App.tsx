import { Link, Route, Routes } from 'react-router-dom'
import { Home } from '@/pages/Home'
import { ToS } from '@/pages/ToS'
import { Privacy } from '@/pages/Privacy'
import { FAQ } from '@/pages/FAQ'
import { useLocale } from '@/hooks/useLocale'
import { ModelLoader } from '@/components/ModelLoader/ModelLoader'

function Header() {
  const { locale, t, switchLocale } = useLocale()
  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-4">
      <Link to="/" className="font-display text-xl font-extrabold tracking-wide">
        ⬡ SCALEVORA{' '}
        <span className="font-body text-sm font-normal text-text-secondary">
          {t('header.tagline')}
        </span>
      </Link>
      <div className="flex items-center gap-4">
        <ModelLoader />
        <button
          onClick={() => switchLocale(locale === 'en' ? 'id' : 'en')}
          className="font-mono text-xs text-text-secondary hover:text-text-primary"
        >
          {locale === 'en' ? 'EN | id' : 'en | ID'}
        </button>
      </div>
    </header>
  )
}

function Footer() {
  const { t } = useLocale()
  return (
    <footer className="mt-auto border-t border-border px-6 py-6 text-center font-mono text-xs text-text-secondary">
      <nav className="flex justify-center gap-4">
        <Link to="/tos" className="hover:text-text-primary">
          {t('footer.tos')}
        </Link>
        <Link to="/privacy" className="hover:text-text-primary">
          {t('footer.privacy')}
        </Link>
        <Link to="/faq" className="hover:text-text-primary">
          {t('footer.faq')}
        </Link>
        <a
          href="https://github.com/voralab/scalevora"
          target="_blank"
          rel="noreferrer"
          className="hover:text-text-primary"
        >
          {t('footer.github')}
        </a>
      </nav>
      <p className="mt-3">{t('footer.tagline')}</p>
    </footer>
  )
}

export default function App() {
  return (
    <div className="flex min-h-svh flex-col">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tos" element={<ToS />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/faq" element={<FAQ />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
