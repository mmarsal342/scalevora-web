import { Link } from 'react-router-dom'
import { useLocale } from '@/hooks/useLocale'

export function FAQ() {
  const { t } = useLocale()
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <Link to="/" className="font-mono text-sm text-accent hover:underline">
        {t('page.backHome')}
      </Link>
      <h1 className="mt-6 font-display text-4xl font-bold">
        {t('page.faq.title')}
      </h1>
      <p className="mt-6 text-text-secondary">
        [Stub] How it works, offline, browser support, HEIC, why free.
      </p>
    </div>
  )
}
