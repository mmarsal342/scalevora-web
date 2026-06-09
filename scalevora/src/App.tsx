import { Link, Route, Routes } from 'react-router-dom'
import { Home } from '@/pages/Home'
import { ToS } from '@/pages/ToS'
import { Privacy } from '@/pages/Privacy'
import { FAQ } from '@/pages/FAQ'
import { useLocale } from '@/hooks/useLocale'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { ModelLoader } from '@/components/ModelLoader/ModelLoader'
import { UpdatePrompt } from '@/components/UpdatePrompt/UpdatePrompt'

function Logo({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  const cls =
    size === 'lg'
      ? 'font-display text-5xl font-extrabold tracking-tightest md:text-7xl'
      : 'font-display text-base font-extrabold tracking-tight'
  return (
    <span className={cls}>
      <span className="text-muted font-normal">Scale</span>
      <span className="text-accent">Vora</span>
    </span>
  )
}

function OfflineBadge() {
  const online = useOnlineStatus()
  if (online) return null
  return (
    <span className="border border-border bg-surface px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-accent2">
      ● Offline
    </span>
  )
}

function Header() {
  const { locale, t, switchLocale } = useLocale()
  return (
    <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-border bg-bg/85 px-6 py-4 backdrop-blur-md md:px-10">
      <Link to="/" className="flex items-center gap-3 no-underline">
        <Logo />
        <span className="hidden font-mono text-[10px] uppercase tracking-widest text-muted md:inline">
          {t('header.tagline')}
        </span>
      </Link>
      <div className="flex items-center gap-5">
        <OfflineBadge />
        <ModelLoader />
        <button
          onClick={() => switchLocale(locale === 'en' ? 'id' : 'en')}
          className="font-mono text-[11px] uppercase tracking-wider text-muted hover:text-text"
        >
          {locale === 'en' ? 'EN · id' : 'en · ID'}
        </button>
      </div>
    </header>
  )
}

function Footer() {
  const { t } = useLocale()
  return (
    <footer className="mt-auto border-t border-border px-6 py-8 md:px-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
        <Logo />
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-wider text-muted">
          <Link to="/tos" className="hover:text-text">
            {t('footer.tos')}
          </Link>
          <Link to="/privacy" className="hover:text-text">
            {t('footer.privacy')}
          </Link>
          <Link to="/faq" className="hover:text-text">
            {t('footer.faq')}
          </Link>
          <a
            href="https://github.com/mmarsal342/scalevora-web"
            target="_blank"
            rel="noreferrer"
            className="hover:text-text"
          >
            {t('footer.github')}
          </a>
          <a
            href="https://voralab.id"
            target="_blank"
            rel="noreferrer"
            className="hover:text-text"
          >
            voralab.id ↗
          </a>
        </nav>
      </div>
      <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-widest text-muted">
        {t('footer.tagline')}
      </p>
    </footer>
  )
}

export default function App() {
  return (
    <div className="flex min-h-svh flex-col pt-[68px]">
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
      <UpdatePrompt />
    </div>
  )
}
