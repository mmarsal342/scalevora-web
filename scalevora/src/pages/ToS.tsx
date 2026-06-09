import { Link } from 'react-router-dom'
import { useLocale } from '@/hooks/useLocale'

export function ToS() {
  const { t } = useLocale()
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <Link to="/" className="font-mono text-sm text-accent hover:underline">
        {t('page.backHome')}
      </Link>
      <h1 className="mt-6 font-display text-4xl font-bold">
        {t('page.tos.title')}
      </h1>
      <p className="mt-6 text-text-secondary">
        [Stub] Terms of Service content goes here. AS IS, no warranty, user
        responsible for content processed.
      </p>
    </div>
  )
}
